/**
 * Utilities and constants for the Google Calendar-style Day Schedule View.
 */
import type { Booking } from '../types';

export const TIMELINE_START_HOUR = 0;   // 12:00 AM
export const TIMELINE_END_HOUR = 24;    // 12:00 AM next day (full 24h)
export const TOTAL_MINUTES = 24 * 60;   // 1440 mins
export const HOURS = Array.from(
  { length: 25 },
  (_, i) => i
); // 0, 1, 2, ... 24

export const MEETING_PALETTES = [
  { bg: '#2563eb', border: '#1d4ed8' }, // Blue
  { bg: '#0d9488', border: '#0f766e' }, // Teal
  { bg: '#7c3aed', border: '#6d28d9' }, // Purple
  { bg: '#ea580c', border: '#c2410c' }, // Orange/Amber
  { bg: '#0284c7', border: '#0369a1' }, // Sky Blue
  { bg: '#db2777', border: '#be185d' }, // Rose
];

export function format24H(mins: number): string {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatClockTime(mins: number): string {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatDuration(diffMins: number): string {
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getTodayInZone(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export interface DragState {
  roomId: number;
  startMin: number;
  currentMin: number;
}

export interface RenderedBookingItem {
  booking: Booking;
  leftPct: number;
  widthPct: number;
  startClock: string;
  endClock: string;
  palette: { bg: string; border: string };
}

export function computeDayBookingsByRoom(
  bookings: Booking[],
  selectedDate: string,
  activeTz: string
): Map<number, RenderedBookingItem[]> {
  const map = new Map<number, RenderedBookingItem[]>();

  const getMins = (d: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: activeTz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(d);
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
}
