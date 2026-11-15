import type { Booking } from '../types';
import { cancelBooking } from '../api';
import type { ApiError } from '../types';
import { useState } from 'react';

interface Props {
  booking: Booking;
  onCancelled: (updated: Booking) => void;
  timeZone?: string;
}

function fmtDateTime(startIso: string, endIso: string, timeZone?: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const sDate = s.toLocaleDateString(undefined, { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' });
  const sTime = s.toLocaleTimeString(undefined, { timeZone: tz, hour: 'numeric', minute: '2-digit' });
  const eDate = e.toLocaleDateString(undefined, { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' });
  const eTime = e.toLocaleTimeString(undefined, { timeZone: tz, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

  if (sDate === eDate) {
    return `${sDate}, ${sTime} – ${eTime}`;
  }
  return `${sDate}, ${sTime} – ${eDate}, ${eTime}`;
}

export default function BookingCard({ booking, onCancelled, timeZone }: Props) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const updated = await cancelBooking(booking.id);
      onCancelled(updated);
    } catch (err) {
      setError((err as ApiError).detail ?? 'Cancel failed.');
    } finally {
      setCancelling(false);
    }
  };

  const isCancelled = booking.status === 'cancelled';

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1rem',
        boxShadow: 'var(--shadow)',
        opacity: isCancelled ? 0.72 : 1,
        transition: 'opacity .2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}>
              {booking.customer_name}
            </span>
            <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '.85rem', marginLeft: '.5rem' }}>
              {booking.customer_email}
            </span>
          </div>
          <div
            style={{ color: 'var(--muted)', fontSize: '.85rem', marginTop: '.25rem' }}
            title={`UTC Time: ${booking.start_time} to ${booking.end_time}`}
          >
            🏢 {booking.room.name} &nbsp;·&nbsp; 🕒 {fmtDateTime(booking.start_time, booking.end_time, timeZone)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexShrink: 0 }}>
          <span className={booking.status === 'confirmed' ? 'badge-confirmed' : 'badge-cancelled'}>
            {booking.status}
          </span>
          {booking.status === 'confirmed' && (
            <button
              className="btn-ghost"
              style={{ fontSize: '.8rem', padding: '.3rem .6rem' }}
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? <span className="spinner" /> : 'Cancel'}
            </button>
          )}
        </div>
      </div>
      {error && <div className="error-banner" style={{ marginTop: '.5rem' }}>⚠️ {error}</div>}
    </div>
  );
}
