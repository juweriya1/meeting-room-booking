import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleCancelled = (updated: Booking) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setToastMsg(`Booking for ${updated.customer_name} was canceled.`);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 4000);
  };

  const confirmedCount = useMemo(() => bookings.filter((b) => b.status === 'confirmed').length, [bookings]);
  const cancelledCount = useMemo(() => bookings.filter((b) => b.status === 'cancelled').length, [bookings]);
  const totalCount = bookings.length;

  const visibleBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings;
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

  const tabs: Array<{ id: 'confirmed' | 'cancelled' | 'all'; label: string; count: number; color: string }> = [
    { id: 'confirmed', label: 'Active', count: confirmedCount, color: 'var(--primary)' },
    { id: 'cancelled', label: 'Cancelled', count: cancelledCount, color: 'var(--danger)' },
    { id: 'all', label: 'All', count: totalCount, color: 'var(--text)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      {/* Top Controls: Filter Info & Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem', fontSize: '.85rem', color: 'var(--muted)' }}>
        <div>{filterRoomId != null ? <span>Filtered to: <strong>{selectedRoomName || `Room #${filterRoomId}`}</strong></span> : <span>Showing all rooms</span>}</div>
        <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
          {filterRoomId != null && onClearFilter && (
            <button className="btn-ghost" style={{ fontSize: '.8rem', padding: '.2rem .5rem', color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={onClearFilter}>
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
          {tabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className="btn-ghost"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  fontSize: '.78rem',
                  padding: '.2rem .6rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'var(--surface)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? tab.color : 'var(--muted)',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Cancellation Feedback Toast with Direct Navigation */}
      {toastMsg && (
        <div style={{ background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.25)', color: 'var(--primary)', padding: '.45rem .85rem', borderRadius: '10px', fontSize: '.82rem', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
          <span>ℹ️ {toastMsg}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            {statusFilter === 'confirmed' && (
              <button type="button" className="btn-ghost" onClick={() => setStatusFilter('cancelled')} style={{ fontSize: '.75rem', padding: '.15rem .45rem', textDecoration: 'underline', border: 'none', color: 'var(--primary)' }}>
                View in Cancelled →
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={() => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); setToastMsg(null); }} style={{ fontSize: '.8rem', padding: '0 .3rem', border: 'none', color: 'var(--muted)' }} title="Dismiss">
              ✕
            </button>
          </div>
        </div>
      )}

      {loading && <div className="empty-state"><span className="spinner" /> Loading bookings…</div>}
      {!loading && error && <div className="error-banner">⚠️ {error}</div>}
      {!loading && !error && visibleBookings.length === 0 && (
        <div className="empty-state">
          {statusFilter === 'confirmed' ? 'No active bookings found.' : statusFilter === 'cancelled' ? 'No cancelled bookings.' : 'No bookings found.'}
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
