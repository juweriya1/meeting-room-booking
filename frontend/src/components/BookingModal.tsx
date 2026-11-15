import { useState, useEffect } from 'react';
import { fetchRoom, createBooking } from '../api';
import { parseDateTimeInZone, getTimezoneDisplayInfo } from '../types';
import type { Room, Booking, ApiError } from '../types';

interface Props {
  roomId: number;
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

const EMPTY_FORM: FormState = { customer_name: '', customer_email: '', start_time: '', end_time: '' };

export default function BookingModal({ roomId, onClose, onBookingCreated, timeZone }: Props) {
  const [room, setRoom]           = useState<Room | null>(null);
  const [roomErr, setRoomErr]     = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting]   = useState(false);
  const [apiError, setApiError]       = useState<{ status: number; detail: string } | null>(null);
  const [success, setSuccess]         = useState(false);
  const activeTz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

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
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setFieldErrors((f) => ({ ...f, [e.target.name]: undefined }));
    setApiError(null);
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

  const field = (label: string, name: keyof FormState, type = 'text') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      <label style={{ fontSize: '.85rem', fontWeight: 500 }}>{label}</label>
      <input
        name={name}
        type={type}
        value={form[name]}
        onChange={handleChange}
        style={{ borderColor: fieldErrors[name] ? 'var(--danger)' : undefined }}
      />
      {fieldErrors[name] && <span style={{ color: 'var(--danger)', fontSize: '.8rem' }}>{fieldErrors[name]}</span>}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '1.5rem', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem' }}>Book a Room</h2>
          <button className="btn-ghost" style={{ padding: '.2rem .5rem' }} onClick={onClose}>✕</button>
        </div>

        {/* Room info */}
        {roomErr && <div className="error-banner">⚠️ {roomErr}</div>}
        {room && (
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '.75rem 1rem', fontSize: '.9rem' }}>
            <strong>{room.name}</strong> &nbsp;·&nbsp; 📍 {room.location} &nbsp;·&nbsp; 👥 {room.capacity}
          </div>
        )}

        {/* 409 Conflict banner */}
        {apiError?.status === 409 && (
          <div className="error-banner" style={{ fontWeight: 600 }}>
            🚫 Conflict: {apiError.detail}
          </div>
        )}

        {/* Other API error */}
        {apiError && apiError.status !== 409 && (
          <div className="error-banner">⚠️ {apiError.detail}</div>
        )}

        {/* Success */}
        {success ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2rem' }}>✅</div>
            <div style={{ fontWeight: 600 }}>Booking confirmed!</div>
            <button className="btn-primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }} noValidate>
            {field('Your Name', 'customer_name')}
            {field('Your Email', 'customer_email', 'email')}
            {field('Start Time', 'start_time', 'datetime-local')}
            {field('End Time', 'end_time', 'datetime-local')}
            <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
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
