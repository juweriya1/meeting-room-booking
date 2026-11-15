import type { Booking } from '../types';

interface Props {
  booking: Booking;
  leftPct: number;
  widthPct: number;
  startClock: string;
  endClock: string;
  palette: { bg: string; border: string };
  activeTz: string;
}

export default function ScheduleBookingBlock({
  booking,
  leftPct,
  widthPct,
  startClock,
  endClock,
  palette,
  activeTz,
}: Props) {
  return (
    <div
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
  );
}
