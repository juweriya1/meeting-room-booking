/** Shared TypeScript interfaces matching the backend serializer output. */

import { getOffsetMinutes, formatOffsetString } from './canonicalTimezones';

export interface Room {
  id: number;
  name: string;
  location: string;
  capacity: number;
}

export interface Booking {
  id: number;
  room: Room;
  customer_name: string;
  customer_email: string;
  start_time: string; // ISO 8601 UTC
  end_time: string;   // ISO 8601 UTC
  status: 'confirmed' | 'cancelled';
  created_at: string;
}

export interface BookingPayload {
  room: number;
  customer_name: string;
  customer_email: string;
  start_time: string;
  end_time: string;
}

export interface ApiError {
  status: number;
  detail: string;
}

export function getTimezoneDisplayInfo(tz: string): { city: string; offset: string; label: string } {
  try {
    const mins = getOffsetMinutes(tz);
    const offset = formatOffsetString(mins);
    const city = tz === 'UTC' ? 'UTC' : (tz.replace(/_/g, ' ').split('/').pop() || tz);
    return { city, offset, label: `${city} (${offset})` };
  } catch {
    return { city: tz, offset: '', label: tz };
  }
}

export function parseDateTimeInZone(dateTimeStr: string, timeZone: string): string {
  const [datePart, timePart] = dateTimeStr.split('T');
  if (!datePart || !timePart) return new Date(dateTimeStr).toISOString();

  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  let guess = Date.UTC(year, month - 1, day, hours, minutes);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(guess));
    const p: Record<string, string> = {};
    for (const part of parts) p[part.type] = part.value;
    let h = Number(p.hour);
    if (h === 24) h = 0;
    const formattedInTz = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), h, Number(p.minute));
    const diff = Date.UTC(year, month - 1, day, hours, minutes) - formattedInTz;
    if (diff === 0) break;
    guess += diff;
  }
  return new Date(guess).toISOString();
}
