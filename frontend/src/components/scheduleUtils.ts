/**
 * Utilities and constants for the Google Calendar-style Day Schedule View.
 */

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
