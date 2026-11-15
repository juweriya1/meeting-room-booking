import type { Room } from '../types';
import ScheduleBookingBlock from './ScheduleBookingBlock';
import {
  TIMELINE_START_HOUR,
  TOTAL_MINUTES,
  HOURS,
  formatClockTime,
  formatDuration,
  type DragState,
  type RenderedBookingItem,
} from './scheduleUtils';

interface DayScheduleRowProps {
  room: Room;
  bookings: RenderedBookingItem[];
  activeTz: string;
  isHovered: boolean;
  isDragging: boolean;
  hoverInfo: { roomId: number; min: number; pct: number } | null;
  dragState: DragState | null;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>, roomId: number) => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>, roomId: number) => void;
  onMouseLeave: () => void;
}

export default function DayScheduleRow({
  room,
  bookings,
  activeTz,
  isHovered,
  isDragging,
  hoverInfo,
  dragState,
  onMouseMove,
  onMouseDown,
  onMouseLeave,
}: DayScheduleRowProps) {
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
    <div style={{ display: 'flex', alignItems: 'center', height: '68px' }}>
      {/* Room Summary Header */}
      <div style={{ width: '125px', flexShrink: 0, paddingRight: '.6rem' }}>
        <div style={{ fontWeight: 700, fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {room.name}
        </div>
        <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
          👥 {room.capacity} seats
        </div>
      </div>

      {/* Timeline Track */}
      <div
        onMouseMove={(e) => onMouseMove(e, room.id)}
        onMouseDown={(e) => onMouseDown(e, room.id)}
        onMouseLeave={onMouseLeave}
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

        {/* Booking Blocks */}
        {bookings.map((item) => (
          <ScheduleBookingBlock
            key={item.booking.id}
            booking={item.booking}
            leftPct={item.leftPct}
            widthPct={item.widthPct}
            startClock={item.startClock}
            endClock={item.endClock}
            palette={item.palette}
            activeTz={activeTz}
          />
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
        {isHovered && !isDragging && hoverInfo && (
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
}
