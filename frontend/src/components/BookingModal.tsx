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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', minWidth: 0, width: '100%' }}>
      <label style={{ fontSize: '.84rem', fontWeight: 600, color: 'var(--text)' }}>{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        min={min}
        value={form[name]}
        onChange={handleChange}
        style={{
          borderColor: fieldErrors[name] ? 'var(--danger)' : '#cbd5e1',
          background: '#f8fafc',
          padding: '.6rem .85rem',
          fontSize: '.9rem',
          borderRadius: '12px',
          boxSizing: 'border-box',
          width: '100%',
          maxWidth: '100%',
        }}
      />
      {fieldErrors[name] && <span style={{ color: 'var(--danger)', fontSize: '.8rem' }}>{fieldErrors[name]}</span>}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '1.75rem', width: '100%', maxWidth: '500px', boxShadow: '0 25px 60px -15px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column', gap: '1.1rem', border: '1px solid rgba(226, 232, 240, 0.9)', boxSizing: 'border-box', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Book a Room</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid var(--border)',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: '.9rem',
              transition: 'background .15s ease',
            }}
          >
            ✕
          </button>
        </div>

        {roomErr && <div className="error-banner" style={{ borderRadius: '12px' }}>⚠️ {roomErr}</div>}
        {room && (
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '.85rem 1rem', fontSize: '.88rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.4rem' }}>
            <div>
              <strong style={{ fontSize: '.95rem' }}>{room.name}</strong>
              <span style={{ color: 'var(--muted)', marginLeft: '.5rem' }}>📍 {room.location}</span>
            </div>
            <span style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '999px', padding: '.2rem .65rem', fontSize: '.75rem', fontWeight: 600 }}>
              👥 {room.capacity} seats
            </span>
          </div>
        )}

        {apiError?.status === 409 && (
          <div className="error-banner" style={{ fontWeight: 600, borderRadius: '12px' }}>
            🚫 Conflict: {apiError.detail}
          </div>
        )}

        {apiError && apiError.status !== 409 && (
          <div className="error-banner" style={{ borderRadius: '12px' }}>⚠️ {apiError.detail}</div>
        )}

        {success ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '2.5rem' }}>✅</div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Booking confirmed!</div>
            <button className="btn-primary" style={{ borderRadius: '12px', padding: '.6rem 1.5rem' }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.95rem' }} noValidate>
            {field('👤 Your Name', 'customer_name')}
            {field('✉️ Your Email', 'customer_email', 'email')}

            {/* Stacked Start & End Time full-width to prevent any spill */}
            {field('🕒 Start Time', 'start_time', 'datetime-local', '900', defaultTimes.start)}
            {field('🕒 End Time', 'end_time', 'datetime-local', '900', form.start_time || defaultTimes.start)}

            <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '.78rem', color: 'var(--muted)', fontWeight: 600 }}>Quick duration:</span>
              {[15, 30, 45, 60, 90, 120].map((m) => {
                const isActive = currentDurationMins === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDurationMinutes(m)}
                    style={{
                      fontSize: '.75rem',
                      padding: '.25rem .65rem',
                      borderRadius: '999px',
                      background: isActive ? 'var(--primary)' : '#f1f5f9',
                      color: isActive ? '#ffffff' : 'var(--text)',
                      border: isActive ? '1px solid var(--primary)' : '1px solid #e2e8f0',
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all .15s ease',
                      boxShadow: isActive ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
                    }}
                  >
                    {m < 60 ? `${m}m` : m === 60 ? '1h' : `${m / 60}h`}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: '.78rem', color: '#475569', background: 'rgba(37, 99, 235, 0.05)', padding: '.65rem .9rem', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.15)' }}>
              🌐 Times are entered in <strong>{getTimezoneDisplayInfo(activeTz).label}</strong> and stored in UTC.
            </div>

            <div style={{ display: 'flex', gap: '.65rem', justifyContent: 'flex-end', marginTop: '.35rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '.55rem 1.15rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 500,
                  fontSize: '.88rem',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '.55rem 1.35rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '.88rem',
                  boxShadow: '0 3px 10px rgba(37, 99, 235, 0.3)',
                  border: 'none',
                }}
              >
                {submitting ? <><span className="spinner" /> Booking…</> : 'Confirm Booking'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
