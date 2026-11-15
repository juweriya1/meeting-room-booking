/**
 * api.ts — single network layer. All fetch calls live here.
 * No third-party HTTP clients; uses native fetch (ES2020+).
 * All datetimes sent/received as UTC ISO 8601.
 */
import type { Room, Booking, BookingPayload, ApiError } from './types';

const BASE = '/api';

function parseErrorDetail(payload: unknown, status: number): string {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (typeof payload === 'object' && payload !== null) {
    const p = payload as Record<string, unknown>;
    if (typeof p.error === 'string') return p.error;
    if (typeof p.detail === 'string') return p.detail;

    // Handle DRF serializer validation errors: { field_name: ["error msg"] }
    const fieldErrors = Object.entries(p)
      .map(([field, msgs]) => {
        const text = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
        const label = field === 'non_field_errors' ? '' : `${field.replace('_', ' ')}: `;
        return `${label}${text}`;
      })
      .filter(Boolean);

    if (fieldErrors.length > 0) return fieldErrors.join(' | ');
  }
  return `HTTP ${status}`;
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T; status: number }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  let data: T;
  const text = await res.text();
  try {
    data = JSON.parse(text) as T;
  } catch {
    data = text as unknown as T;
  }

  if (!res.ok) {
    const detail = parseErrorDetail(data, res.status);
    const err: ApiError = { status: res.status, detail };
    throw err;
  }

  return { data, status: res.status };
}

// ── Rooms ──────────────────────────────────────────────────────────────────

export async function fetchRooms(params?: {
  search?: string;
  capacity?: number;
}): Promise<Room[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.capacity) qs.set('capacity', String(params.capacity));
  const query = qs.toString() ? `?${qs}` : '';
  const { data } = await request<Room[]>(`/rooms/${query}`);
  return data;
}

export async function fetchRoom(id: number): Promise<Room> {
  const { data } = await request<Room>(`/rooms/${id}/`);
  return data;
}

// ── Bookings ───────────────────────────────────────────────────────────────

export async function fetchBookings(roomId?: number, status?: 'confirmed' | 'cancelled'): Promise<Booking[]> {
  const qs = new URLSearchParams();
  if (roomId != null) qs.set('room', String(roomId));
  if (status) qs.set('status', status);
  const query = qs.toString() ? `?${qs}` : '';
  const { data } = await request<Booking[]>(`/bookings/${query}`);
  return data;
}

export async function fetchBooking(id: number): Promise<Booking> {
  const { data } = await request<Booking>(`/bookings/${id}/`);
  return data;
}

export async function createBooking(payload: BookingPayload): Promise<Booking> {
  const { data } = await request<Booking>('/bookings/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data;
}

export async function cancelBooking(id: number): Promise<Booking> {
  const { data } = await request<Booking>(`/bookings/${id}/cancel/`, {
    method: 'PATCH',
  });
  return data;
}
