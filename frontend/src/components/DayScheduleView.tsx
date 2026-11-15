import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchRooms, fetchBookings } from '../api';
import { parseDateTimeInZone } from '../types';
import type { Room, Booking, ApiError } from '../types';
import {
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  TOTAL_MINUTES,
  HOURS,
  format24H,
  formatClockTime,
  getTodayInZone,
  computeDayBookingsByRoom,
  type DragState,
} from './scheduleUtils';
import DayScheduleHeader from './DayScheduleHeader';
import DayScheduleRow from './DayScheduleRow';

interface Props {
  selectedRoomId?: number | null;
  onClearRoomFilter?: () => void;
  onBookSlot?: (roomId: number, initialStartTime?: string, initialEndTime?: string) => void;
  refreshTrigger?: number;
  timeZone?: string;
}

export default function DayScheduleView({
  selectedRoomId,
  onClearRoomFilter,
  onBookSlot,
  refreshTrigger,
  timeZone,
}: Props) {
  const activeTz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [selectedDate, setSelectedDate] = useState(() => getTodayInZone(activeTz));
  const [prevTz, setPrevTz] = useState(activeTz);
  const focalUtcRef = useRef<string | null>(null);

  // Timezone Synchronization: If activeTz changes, transform the temporal anchor into the new timezone
  if (activeTz !== prevTz) {
    setPrevTz(activeTz);
    if (focalUtcRef.current) {
      const newDate = new Intl.DateTimeFormat('en-CA', { timeZone: activeTz }).format(
        new Date(focalUtcRef.current)
      );
      setSelectedDate(newDate);
    } else {
      setSelectedDate(getTodayInZone(activeTz));
    }
  }

  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hoverInfo, setHoverInfo] = useState<{ roomId: number; min: number; pct: number } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = dragState;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rData, bData] = await Promise.all([fetchRooms(), fetchBookings()]);
      setRooms(rData);
      setBookings(bData);
    } catch (err) {
      setError((err as ApiError).detail ?? 'Failed to load schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshTrigger]);

  const visibleRooms = useMemo(() => {
    if (selectedRoomId == null) return rooms;
    return rooms.filter((r) => r.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  const shiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
    setSelectedDate(dateObj.toISOString().split('T')[0]);
  };

  const formattedDateTitle = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(dateObj);
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const dayBookingsByRoom = useMemo(
    () => computeDayBookingsByRoom(bookings, selectedDate, activeTz),
    [bookings, selectedDate, activeTz]
  );

  // Auto-scroll & anchor tracking: focus earliest meeting or current hour in active timezone
  useEffect(() => {
    if (loading) return;

    let earliestMin: number | null = null;
    let earliestBookingStartUtc: string | null = null;

    for (const items of dayBookingsByRoom.values()) {
      for (const item of items) {
        const startMin = (item.leftPct / 100) * TOTAL_MINUTES;
        if (earliestMin === null || startMin < earliestMin) {
          earliestMin = startMin;
          earliestBookingStartUtc = item.booking.start_time;
        }
      }
    }

    if (earliestBookingStartUtc) {
      focalUtcRef.current = earliestBookingStartUtc;
    } else if (selectedDate === getTodayInZone(activeTz)) {
      focalUtcRef.current = null;
    } else {
      try {
        focalUtcRef.current = parseDateTimeInZone(`${selectedDate}T12:00`, activeTz);
      } catch {
        focalUtcRef.current = null;
      }
    }

    if (!timelineScrollRef.current) return;
    const el = timelineScrollRef.current;

    // Fallback: current local hour in the active timezone
    if (earliestMin === null) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: activeTz, hour: 'numeric', hour12: false,
      }).formatToParts(new Date());
      const currentHour = Number(parts.find((p) => p.type === 'hour')?.value ?? 8);
      earliestMin = currentHour * 60;
    }

    // Show ~90 min of context before the first meeting / current hour
    const bufferMin = 90;
    const targetMin = Math.max(0, earliestMin - bufferMin);
    const trackWidth = el.scrollWidth - 125;
    const targetScroll = targetMin === 0 ? 0 : 125 + trackWidth * (targetMin / TOTAL_MINUTES);
    el.scrollLeft = Math.max(0, targetScroll);
  }, [loading, activeTz, selectedDate, dayBookingsByRoom]);

  const getSnappedMin = (e: React.MouseEvent<HTMLDivElement>): { snappedMin: number; pct: number } => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const rawPct = Math.max(0, Math.min(1, clickX / rect.width));
    const rawMin = TIMELINE_START_HOUR * 60 + rawPct * TOTAL_MINUTES;
    const snappedMin = Math.max(
      TIMELINE_START_HOUR * 60,
      Math.min(TIMELINE_END_HOUR * 60, Math.round(rawMin / 15) * 15)
    );
    const snappedPct = ((snappedMin - TIMELINE_START_HOUR * 60) / TOTAL_MINUTES) * 100;
    return { snappedMin, pct: snappedPct };
  };

  const handleTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>, roomId: number) => {
    const { snappedMin, pct } = getSnappedMin(e);
    setHoverInfo({ roomId, min: snappedMin, pct });
    if (dragState && dragState.roomId === roomId) {
      setDragState((prev) => (prev ? { ...prev, currentMin: snappedMin } : null));
    }
  };

  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>, roomId: number) => {
    if (e.button !== 0) return;
    const { snappedMin } = getSnappedMin(e);
    setDragState({ roomId, startMin: snappedMin, currentMin: snappedMin + 15 });
  };

  const handleTrackMouseUp = (roomId: number) => {
    const currentDrag = dragRef.current;
    setDragState(null);
    if (!currentDrag || currentDrag.roomId !== roomId || !onBookSlot) return;

    let sMin = Math.min(currentDrag.startMin, currentDrag.currentMin);
    let eMin = Math.max(currentDrag.startMin, currentDrag.currentMin);

    if (eMin - sMin < 15) {
      eMin = Math.min(TIMELINE_END_HOUR * 60, sMin + 60);
    }

    const startIso = `${selectedDate}T${format24H(sMin)}`;
    let endIso: string;
    if (eMin >= 1440) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const nextDate = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0)).toISOString().split('T')[0];
      endIso = `${nextDate}T00:00`;
    } else {
      endIso = `${selectedDate}T${format24H(eMin)}`;
    }
    onBookSlot(roomId, startIso, endIso);
  };

  const totalMeetingsOnDay = useMemo(() => {
    let count = 0;
    for (const items of dayBookingsByRoom.values()) {
      count += items.length;
    }
    return count;
  }, [dayBookingsByRoom]);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', userSelect: dragState ? 'none' : 'auto' }}
      onMouseUp={() => {
        if (dragState) handleTrackMouseUp(dragState.roomId);
      }}
    >
      <DayScheduleHeader
        selectedDate={selectedDate}
        formattedDateTitle={formattedDateTitle}
        totalMeetingsOnDay={totalMeetingsOnDay}
        selectedRoomId={selectedRoomId}
        onShiftDate={shiftDate}
        onSetToday={() => setSelectedDate(getTodayInZone(activeTz))}
        onSelectDate={setSelectedDate}
        onClearRoomFilter={onClearRoomFilter}
      />

      {loading && <div className="empty-state"><span className="spinner" /> Loading schedule…</div>}
      {!loading && error && <div className="error-banner">⚠️ {error}</div>}

      {/* Timeline Schedule Canvas */}
      {!loading && !error && (
        <div ref={timelineScrollRef} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflowX: 'auto', overflowY: 'hidden', padding: '.85rem .75rem', maxWidth: '100%', boxSizing: 'border-box' }}>
          <div style={{ minWidth: '1920px', display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
            {/* Friendly Hour Header */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '125px', flexShrink: 0, fontSize: '.78rem', fontWeight: 600, color: 'var(--muted)' }}>
                Room
              </div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', fontWeight: 600, color: 'var(--muted)' }}>
                {HOURS.map((h) => (
                  <span key={h} style={{ width: '0px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {formatClockTime(h * 60)}
                  </span>
                ))}
              </div>
            </div>

            {/* Room Rows with Large Lanes */}
            {visibleRooms.map((room) => (
              <DayScheduleRow
                key={room.id}
                room={room}
                bookings={dayBookingsByRoom.get(room.id) || []}
                activeTz={activeTz}
                isHovered={hoverInfo?.roomId === room.id}
                isDragging={dragState?.roomId === room.id}
                hoverInfo={hoverInfo}
                dragState={dragState}
                onMouseMove={handleTrackMouseMove}
                onMouseDown={handleTrackMouseDown}
                onMouseLeave={() => setHoverInfo((prev) => (prev?.roomId === room.id ? null : prev))}
              />
            ))}
          </div>

          {/* Footer Bar / Instructions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.85rem', paddingTop: '.6rem', borderTop: '1px solid var(--border)', fontSize: '.75rem', color: 'var(--muted)', flexWrap: 'wrap', gap: '.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#2563eb', borderRadius: '3px' }} />
                Confirmed Meetings
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '3px' }} />
                Available Slot
              </span>
            </div>
            <span>💡 <strong>Click and drag</strong> across any room lane to select your custom meeting duration</span>
          </div>
        </div>
      )}
    </div>
  );
}
