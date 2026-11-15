import { useState, useEffect, useCallback } from 'react';
import { fetchBookings } from '../api';
import type { Booking, ApiError } from '../types';
import BookingCard from './BookingCard';

interface Props {
  filterRoomId?: number;
  selectedRoomName?: string;
  onClearFilter?: () => void;
  refreshTrigger?: number;
  timeZone?: string;
}

export default function BookingList({
  filterRoomId,
  selectedRoomName,
  onClearFilter,
  refreshTrigger,
  timeZone,
}: Props) {
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

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  const handleCancelled = (updated: Booking) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem', fontSize: '.85rem', color: 'var(--muted)' }}>
        <div>
          {filterRoomId != null ? (
            <span>
              Filtered to: <strong>{selectedRoomName || `Room #${filterRoomId}`}</strong>
            </span>
          ) : (
            <span>Showing all meetings across all rooms</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
          {filterRoomId != null && onClearFilter && (
            <button
              className="btn-ghost"
              style={{ fontSize: '.8rem', padding: '.2rem .5rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
              onClick={onClearFilter}
            >
              ✕ Show All Rooms
            </button>
          )}
          <button className="btn-ghost" style={{ fontSize: '.8rem', padding: '.2rem .5rem' }} onClick={() => load()}>
            ↺ Refresh
          </button>
        </div>
      </div>

      {loading && <div className="empty-state"><span className="spinner" /> Loading bookings…</div>}
      {!loading && error && <div className="error-banner">⚠️ {error}</div>}
      {!loading && !error && bookings.length === 0 && (
        <div className="empty-state">No bookings found.</div>
      )}
      {!loading && !error && bookings.map((b) => (
        <BookingCard
          key={b.id}
          booking={b}
          onCancelled={handleCancelled}
          timeZone={timeZone}
        />
      ))}
    </div>
  );
}
