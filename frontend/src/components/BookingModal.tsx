import { useState, useEffect, useMemo } from 'react';
import { fetchRoom, createBooking } from '../api';
import {
  parseDateTimeInZone,
  getTimezoneDisplayInfo,
  getNextQuarterHour,
  formatDateTimeInZone,
} from '../types';
import type { Room, Booking, ApiError } from '../types';

interface Props {
  roomId: number;
  initialStartTime?: string;
  initialEndTime?: string;
  onClose: () => void;
  onBookingCreated?: (booking: Booking) => void;
  timeZone?: string;
}

interface FormState {
  customer_name: string;
  customer_email: string;
  start_time: string;
  end_time: string;
}

export default function BookingModal({
  roomId,
  initialStartTime,
  initialEndTime,
  onClose,
  onBookingCreated,
  timeZone,
}: Props) {
  const [room, setRoom]           = useState<Room | null>(null);
  const [roomErr, setRoomErr]     = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting]   = useState(false);
  const [apiError, setApiError]       = useState<{ status: number; detail: string } | null>(null);
  const [success, setSuccess]         = useState(false);

  const activeTz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Compute clean initial quarter-hour boundary in active timezone
  const defaultTimes = useMemo(() => {
    if (initialStartTime) {
      if (initialEndTime) {
        return {
          start: initialStartTime,
          end: initialEndTime,
        };
      }
      try {
        const startUtc = new Date(parseDateTimeInZone(initialStartTime, activeTz));
        const oneHourLater = new Date(startUtc.getTime() + 60 * 60 * 1000);
        return {
          start: initialStartTime,
          end: formatDateTimeInZone(oneHourLater, activeTz),
        };
      } catch {
        // fallback
      }
    }
    const nextQ = getNextQuarterHour();
    const oneHourLater = new Date(nextQ.getTime() + 60 * 60 * 1000);
    return {
      start: formatDateTimeInZone(nextQ, activeTz),
      end: formatDateTimeInZone(oneHourLater, activeTz),
    };
  }, [initialStartTime, initialEndTime, activeTz]);

  const [form, setForm] = useState<FormState>(() => ({
    customer_name: '',
    customer_email: '',
    start_time: defaultTimes.start,
    end_time: defaultTimes.end,
  }));

  const currentDurationMins = useMemo(() => {
    if (!form.start_time || !form.end_time) return null;
    try {
      const s = new Date(parseDateTimeInZone(form.start_time, activeTz)).getTime();
      const e = new Date(parseDateTimeInZone(form.end_time, activeTz)).getTime();
      return Math.round((e - s) / (60 * 1000));
    } catch {
      return null;
    }
  }, [form.start_time, form.end_time, activeTz]);

  useEffect(() => {
    fetchRoom(roomId)
      .then(setRoom)
      .catch((e: ApiError) => setRoomErr(e.detail ?? 'Could not load room.'));
  }, [roomId]);

  const validate = (): boolean => {
    const errs: Partial<FormState> = {};
    if (!form.customer_name.trim())  errs.customer_name  = 'Name is required.';
    if (!form.customer_email.trim()) errs.customer_email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email))
      errs.customer_email = 'Enter a valid email.';

    if (!form.start_time) {
      errs.start_time = 'Start time is required.';
    } else {
      try {
        const utcStart = parseDateTimeInZone(form.start_time, activeTz);
        if (new Date(utcStart).getTime() <= Date.now()) {
          errs.start_time = 'Start time must be in the future.';
        }
      } catch {
        errs.start_time = 'Please enter a valid start time.';
      }
    }

    if (!form.end_time) {
      errs.end_time = 'End time is required.';
    } else if (form.start_time && form.start_time >= form.end_time) {
      errs.end_time = 'End time must be strictly after start time.';
    } else if (form.start_time && form.end_time) {
      const startMs = new Date(parseDateTimeInZone(form.start_time, activeTz)).getTime();
      const endMs = new Date(parseDateTimeInZone(form.end_time, activeTz)).getTime();
      const diffMins = (endMs - startMs) / (1000 * 60);

      if (diffMins < 15) {
        errs.end_time = 'Booking duration must be at least 15 minutes.';
      } else if (diffMins > 24 * 60) {
        errs.end_time = 'Booking duration cannot exceed 24 hours.';
      }

      const startMin = parseInt(form.start_time.split('T')[1]?.split(':')[1] || '0', 10);
      const endMin = parseInt(form.end_time.split('T')[1]?.split(':')[1] || '0', 10);
      if (startMin % 15 !== 0) {
        errs.start_time = 'Start time must be aligned to a 15-minute interval (:00, :15, :30, :45).';
      }
      if (endMin % 15 !== 0) {
        errs.end_time = 'End time must be aligned to a 15-minute interval (:00, :15, :30, :45).';
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      // Auto-advance end_time if start_time is set to or past existing end_time
      if (name === 'start_time' && value && next.end_time && value >= next.end_time) {
        try {
          const startUtc = new Date(parseDateTimeInZone(value, activeTz));
          const newEndUtc = new Date(startUtc.getTime() + 60 * 60 * 1000);
          next.end_time = formatDateTimeInZone(newEndUtc, activeTz);
        } catch {
          // ignore
        }
      }
      return next;
    });
    setFieldErrors((f) => ({ ...f, [name]: undefined }));
    setApiError(null);
  };

  const setDurationMinutes = (mins: number) => {
    if (!form.start_time) return;
    try {
      const startUtc = new Date(parseDateTimeInZone(form.start_time, activeTz));
      const endUtc = new Date(startUtc.getTime() + mins * 60 * 1000);
      setForm((f) => ({ ...f, end_time: formatDateTimeInZone(endUtc, activeTz) }));
      setFieldErrors((f) => ({ ...f, end_time: undefined }));
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const created = await createBooking({
        room: roomId,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        start_time: parseDateTimeInZone(form.start_time, activeTz),
        end_time: parseDateTimeInZone(form.end_time, activeTz),
      });
      setSuccess(true);
      onBookingCreated?.(created);
    } catch (err) {
      setApiError(err as ApiError);
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label: string, name: keyof FormState, type = 'text', step?: string, min?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      <label style={{ fontSize: '.84rem', fontWeight: 600, color: 'var(--text)' }}>{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        min={min}
        value={form[name]}
        onChange={handleChange}
        style={{
          borderColor: fieldErrors[name] ? 'var(--danger)' : undefined,
          background: 'var(--bg)',
          padding: '.5rem .75rem',
          fontSize: '.88rem',
        }}
      />
      {fieldErrors[name] && <span style={{ color: 'var(--danger)', fontSize: '.8rem' }}>{fieldErrors[name]}</span>}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '1.6rem', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Book a Room</h2>
          <button className="btn-ghost" style={{ padding: '.2rem .5rem', fontSize: '.9rem' }} onClick={onClose}>✕</button>
        </div>

        {roomErr && <div className="error-banner">⚠️ {roomErr}</div>}
        {room && (
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '.75rem 1rem', fontSize: '.88rem', border: '1px solid var(--border)' }}>
            <strong>{room.name}</strong> &nbsp;·&nbsp; 📍 {room.location} &nbsp;·&nbsp; 👥 {room.capacity} seats
          </div>
        )}

        {apiError?.status === 409 && (
          <div className="error-banner" style={{ fontWeight: 600 }}>
            🚫 Conflict: {apiError.detail}
          </div>
        )}

        {apiError && apiError.status !== 409 && (
          <div className="error-banner">⚠️ {apiError.detail}</div>
        )}

        {success ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2rem' }}>✅</div>
            <div style={{ fontWeight: 600 }}>Booking confirmed!</div>
            <button className="btn-primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }} noValidate>
            {field('👤 Your Name', 'customer_name')}
            {field('✉️ Your Email', 'customer_email', 'email')}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              {field('🕒 Start Time', 'start_time', 'datetime-local', '900', defaultTimes.start)}
              {field('🕒 End Time', 'end_time', 'datetime-local', '900', form.start_time || defaultTimes.start)}
            </div>

            <div style={{ display: 'flex', gap: '.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '.75rem', color: 'var(--muted)', fontWeight: 500 }}>Quick duration:</span>
              {[15, 30, 45, 60, 90, 120].map((m) => {
                const isActive = currentDurationMins === m;
                return (
                  <button
                    key={m}
                    type="button"
                    className="btn-ghost"
                    onClick={() => setDurationMinutes(m)}
                    style={{
                      fontSize: '.72rem',
                      padding: '.15rem .5rem',
                      borderRadius: '12px',
                      background: isActive ? 'var(--primary)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text)',
                      borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all .15s ease',
                    }}
                  >
                    {m < 60 ? `${m}m` : m === 60 ? '1h' : `${m / 60}h`}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: '.78rem', color: 'var(--muted)', background: 'var(--bg)', padding: '.45rem .75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              🌐 Times are entered in <strong>{getTimezoneDisplayInfo(activeTz).label}</strong> and stored in UTC.
            </div>

            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '.25rem' }}>
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? <><span className="spinner" /> Booking…</> : 'Confirm Booking'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
