import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchRooms, fetchBookings } from '../api';
import { parseDateTimeInZone } from '../types';
import type { Room, Booking, ApiError } from '../types';
import {
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  TOTAL_MINUTES,
  HOURS,
  MEETING_PALETTES,
  format24H,
  formatClockTime,
  formatDuration,
  getTodayInZone,
  type DragState,
} from './scheduleUtils';

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

  const dayBookingsByRoom = useMemo(() => {
    const map = new Map<number, Array<{
      booking: Booking;
      leftPct: number;
      widthPct: number;
      startClock: string;
      endClock: string;
      palette: { bg: string; border: string };
    }>>();

    const getMins = (d: Date) => {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: activeTz, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(d);
      const p: Record<string, string> = {};
      parts.forEach((x) => (p[x.type] = x.value));
      let h = Number(p.hour);
      if (h === 24) h = 0;
      return h * 60 + Number(p.minute);
    };

    const listForDay: Array<{ booking: Booking; startMin: number; endMin: number; s: Date; e: Date }> = [];
    for (const b of bookings) {
      if (b.status !== 'confirmed') continue;
      const s = new Date(b.start_time);
      const e = new Date(b.end_time);
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: activeTz });
      const sDate = fmt.format(s);
      const eDate = fmt.format(e);

      if (eDate < selectedDate || sDate > selectedDate) continue;

      const rawStartMin = sDate < selectedDate ? 0 : getMins(s);
      const rawEndMin = eDate > selectedDate ? 1440 : getMins(e);
      const timelineStartMin = TIMELINE_START_HOUR * 60;
      const timelineEndMin = TIMELINE_END_HOUR * 60;
      const clampedStart = Math.max(rawStartMin, timelineStartMin);
      const clampedEnd = Math.min(rawEndMin, timelineEndMin);

      if (clampedEnd <= clampedStart) continue;
      listForDay.push({ booking: b, startMin: clampedStart, endMin: clampedEnd, s, e });
    }

    const grouped = new Map<number, typeof listForDay>();
    for (const item of listForDay) {
      const l = grouped.get(item.booking.room.id) || [];
      l.push(item);
      grouped.set(item.booking.room.id, l);
    }

    const timelineStartMin = TIMELINE_START_HOUR * 60;
    for (const [roomId, items] of grouped.entries()) {
      items.sort((a, b) => a.startMin - b.startMin);
      const renderedItems = items.map((item, idx) => {
        const leftPct = ((item.startMin - timelineStartMin) / TOTAL_MINUTES) * 100;
        const widthPct = ((item.endMin - item.startMin) / TOTAL_MINUTES) * 100;
        const palette = MEETING_PALETTES[idx % MEETING_PALETTES.length];
        const timeFmt = (d: Date) =>
          d.toLocaleTimeString('en-US', { timeZone: activeTz, hour: 'numeric', minute: '2-digit' });

        return {
          booking: item.booking,
          leftPct,
          widthPct,
          startClock: timeFmt(item.s),
          endClock: timeFmt(item.e),
          palette,
        };
      });
      map.set(roomId, renderedItems);
    }
    return map;
  }, [bookings, selectedDate, activeTz]);

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
      {/* Date Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem', background: 'var(--surface)', padding: '.6rem .85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <button type="button" className="btn-ghost" style={{ padding: '.2rem .5rem', fontSize: '.8rem' }} onClick={() => shiftDate(-1)}>◀ Prev</button>
          <button type="button" className="btn-ghost" style={{ padding: '.2rem .5rem', fontSize: '.8rem' }} onClick={() => setSelectedDate(getTodayInZone(activeTz))}>Today</button>
          <button type="button" className="btn-ghost" style={{ padding: '.2rem .5rem', fontSize: '.8rem' }} onClick={() => shiftDate(1)}>Next ▶</button>
          <strong style={{ fontSize: '.9rem', marginLeft: '.3rem' }}>{formattedDateTitle}</strong>
          {totalMeetingsOnDay > 0 && (
            <span
              style={{
                fontSize: '.75rem',
                color: 'var(--primary)',
                background: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: '12px',
                padding: '2px 8px',
                fontWeight: 600,
                marginLeft: '.3rem',
              }}
            >
              {totalMeetingsOnDay} {totalMeetingsOnDay === 1 ? 'meeting' : 'meetings'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            style={{ fontSize: '.8rem', padding: '.2rem .4rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)' }}
          />
          {selectedRoomId != null && onClearRoomFilter && (
            <button type="button" className="btn-ghost" style={{ fontSize: '.75rem', padding: '.2rem .45rem', color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={onClearRoomFilter}>
              ✕ Show All Rooms
            </button>
          )}
        </div>
      </div>

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
            {visibleRooms.map((room) => {
              const bList = dayBookingsByRoom.get(room.id) || [];
              const isHovered = hoverInfo?.roomId === room.id;
              const isDragging = dragState?.roomId === room.id;

              let dragLeftPct = 0;
              let dragWidthPct = 0;
              let dragDurationText = '';
              if (isDragging && dragState) {
                const s = Math.min(dragState.startMin, dragState.currentMin);
                const e = Math.max(dragState.startMin, dragState.currentMin);
                dragLeftPct = ((s - TIMELINE_START_HOUR * 60) / TOTAL_MINUTES) * 100;
                dragWidthPct = Math.max(((e - s) / TOTAL_MINUTES) * 100, 1);
                dragDurationText = `${formatClockTime(s)} – ${formatClockTime(e)} (${formatDuration(Math.max(e - s, 15))})`;
              }

              return (
                <div key={room.id} style={{ display: 'flex', alignItems: 'center', height: '68px' }}>
                  <div style={{ width: '125px', flexShrink: 0, paddingRight: '.6rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {room.name}
                    </div>
                    <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
                      👥 {room.capacity} seats
                    </div>
                  </div>

                  <div
                    onMouseMove={(e) => handleTrackMouseMove(e, room.id)}
                    onMouseDown={(e) => handleTrackMouseDown(e, room.id)}
                    onMouseLeave={() => setHoverInfo((prev) => (prev?.roomId === room.id ? null : prev))}
                    style={{
                      flex: 1,
                      height: '100%',
                      position: 'relative',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      cursor: isDragging ? 'col-resize' : 'crosshair',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Background hour gridlines */}
                    {HOURS.slice(1, -1).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: `${((i + 1) / (HOURS.length - 1)) * 100}%`,
                          borderLeft: '1px dashed rgba(0,0,0,0.08)',
                          pointerEvents: 'none',
                        }}
                      />
                    ))}

                    {/* Booking Blocks (Large & Alternating Colors) */}
                    {bList.map(({ booking, leftPct, widthPct, startClock, endClock, palette }) => (
                      <div
                        key={booking.id}
                        onMouseDown={(e) => e.stopPropagation()}
                        title={`Customer: ${booking.customer_name} (${booking.customer_email})\nTime in ${activeTz}: ${startClock} – ${endClock}\nUTC: ${booking.start_time} to ${booking.end_time}`}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          bottom: '6px',
                          left: `${leftPct}%`,
                          width: `${Math.max(widthPct, 2.5)}%`,
                          background: palette.bg,
                          border: `1px solid ${palette.border}`,
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.18)',
                          zIndex: 5,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          👤 {booking.customer_name}
                        </div>
                        <div style={{ fontSize: '.7rem', opacity: 0.92, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          🕒 {startClock} – {endClock}
                        </div>
                      </div>
                    ))}

                    {/* Live Drag-to-Select Preview Box */}
                    {isDragging && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '4px',
                          bottom: '4px',
                          left: `${dragLeftPct}%`,
                          width: `${dragWidthPct}%`,
                          background: 'rgba(37, 99, 235, 0.22)',
                          border: '2px dashed #2563eb',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 15,
                          pointerEvents: 'none',
                          color: '#1d4ed8',
                          fontWeight: 700,
                          fontSize: '.74rem',
                          boxShadow: '0 0 10px rgba(37, 99, 235, 0.2)',
                        }}
                      >
                        {dragDurationText}
                      </div>
                    )}

                    {/* Live Cursor Hover Time Indicator */}
                    {isHovered && !isDragging && (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${hoverInfo.pct}%`,
                            width: '2px',
                            background: '#2563eb',
                            pointerEvents: 'none',
                            zIndex: 20,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '4px',
                            left: `clamp(10px, ${hoverInfo.pct}%, calc(100% - 65px))`,
                            transform: 'translateX(-50%)',
                            background: '#1e293b',
                            color: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '.68rem',
                            fontWeight: 600,
                            pointerEvents: 'none',
                            zIndex: 25,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                          }}
                        >
                          {formatClockTime(hoverInfo.min)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
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
