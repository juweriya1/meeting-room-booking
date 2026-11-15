import { useState, useEffect, useCallback } from 'react';
import { fetchBookings } from '../api';
import type { Booking, ApiError } from '../types';
import BookingCard from './BookingCard';

interface Props {
  filterRoomId?: number;
}

export default function BookingList({ filterRoomId }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBookings(filterRoomId);
      setBookings(data);
    } catch (err) {
      setError((err as ApiError).detail ?? 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [filterRoomId]);

  useEffect(() => { void load(); }, [load]);

  const handleCancelled = (updated: Booking) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      {filterRoomId != null && (
        <div style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
          Showing bookings for room #{filterRoomId} &nbsp;
          <button className="btn-ghost" style={{ fontSize: '.8rem', padding: '.2rem .5rem' }} onClick={() => load()}>
            ↺ Refresh
          </button>
        </div>
      )}

      {loading && <div className="empty-state"><span className="spinner" /> Loading bookings…</div>}
      {!loading && error && <div className="error-banner">⚠️ {error}</div>}
      {!loading && !error && bookings.length === 0 && (
        <div className="empty-state">No bookings found.</div>
      )}
      {!loading && !error && bookings.map((b) => (
        <BookingCard key={b.id} booking={b} onCancelled={handleCancelled} />
      ))}
    </div>
  );
}
