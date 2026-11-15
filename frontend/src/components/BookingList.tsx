import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [statusFilter, setStatusFilter] = useState<'confirmed' | 'cancelled' | 'all'>('confirmed');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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
    setToastMsg(`Booking for ${updated.customer_name} was canceled.`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const confirmedCount = useMemo(() => bookings.filter((b) => b.status === 'confirmed').length, [bookings]);
  const cancelledCount = useMemo(() => bookings.filter((b) => b.status === 'cancelled').length, [bookings]);
  const totalCount = bookings.length;

  const visibleBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings;
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      {/* Top Controls: Filter Info & Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem', fontSize: '.85rem', color: 'var(--muted)' }}>
        <div>
          {filterRoomId != null ? (
            <span>
              Filtered to: <strong>{selectedRoomName || `Room #${filterRoomId}`}</strong>
            </span>
          ) : (
            <span>Showing all rooms</span>
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

      {/* Status Segmented Control (Approach 2: Active by default) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
        <div style={{ display: 'flex', gap: '.25rem', background: 'var(--bg)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setStatusFilter('confirmed')}
            style={{
              fontSize: '.78rem',
              padding: '.2rem .6rem',
              borderRadius: '8px',
              border: 'none',
              background: statusFilter === 'confirmed' ? 'var(--surface)' : 'transparent',
              fontWeight: statusFilter === 'confirmed' ? 600 : 400,
              color: statusFilter === 'confirmed' ? 'var(--primary)' : 'var(--muted)',
              boxShadow: statusFilter === 'confirmed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Active ({confirmedCount})
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setStatusFilter('cancelled')}
            style={{
              fontSize: '.78rem',
              padding: '.2rem .6rem',
              borderRadius: '8px',
              border: 'none',
              background: statusFilter === 'cancelled' ? 'var(--surface)' : 'transparent',
              fontWeight: statusFilter === 'cancelled' ? 600 : 400,
              color: statusFilter === 'cancelled' ? 'var(--danger)' : 'var(--muted)',
              boxShadow: statusFilter === 'cancelled' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Cancelled ({cancelledCount})
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setStatusFilter('all')}
            style={{
              fontSize: '.78rem',
              padding: '.2rem .6rem',
              borderRadius: '8px',
              border: 'none',
              background: statusFilter === 'all' ? 'var(--surface)' : 'transparent',
              fontWeight: statusFilter === 'all' ? 600 : 400,
              color: statusFilter === 'all' ? 'var(--text)' : 'var(--muted)',
              boxShadow: statusFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            All ({totalCount})
          </button>
        </div>
      </div>

      {/* Cancellation Feedback Toast */}
      {toastMsg && (
        <div style={{ background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.25)', color: 'var(--primary)', padding: '.5rem .85rem', borderRadius: '10px', fontSize: '.82rem', fontWeight: 500 }}>
          ℹ️ {toastMsg}
        </div>
      )}

      {loading && <div className="empty-state"><span className="spinner" /> Loading bookings…</div>}
      {!loading && error && <div className="error-banner">⚠️ {error}</div>}
      {!loading && !error && visibleBookings.length === 0 && (
        <div className="empty-state">
          {statusFilter === 'confirmed'
            ? 'No active bookings found.'
            : statusFilter === 'cancelled'
            ? 'No cancelled bookings.'
            : 'No bookings found.'}
        </div>
      )}
      {!loading && !error && visibleBookings.map((b) => (
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
