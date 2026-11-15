import type { Booking } from '../types';
import { cancelBooking } from '../api';
import type { ApiError } from '../types';
import { useState } from 'react';

interface Props {
  booking: Booking;
  onCancelled: (updated: Booking) => void;
}

function fmtLocal(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function BookingCard({ booking, onCancelled }: Props) {
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

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', boxShadow: 'var(--shadow)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {booking.customer_name}
            <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '.85rem', marginLeft: '.5rem' }}>
              {booking.customer_email}
            </span>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '.85rem', marginTop: '.25rem' }}>
            🏢 {booking.room.name} &nbsp;·&nbsp; {fmtLocal(booking.start_time)} – {fmtLocal(booking.end_time)}
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
