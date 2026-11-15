/**
 * api.ts — single network layer. All fetch calls live here.
 * No third-party HTTP clients; uses native fetch (ES2020+).
 * All datetimes sent/received as UTC ISO 8601.
 */
import type { Room, Booking, BookingPayload, ApiError } from './types';

const BASE = '/api';

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
    // Surface structured error message if present
    const payload = data as Record<string, unknown>;
    const detail =
      (typeof payload?.error === 'string' ? payload.error : null) ??
      (typeof payload?.detail === 'string' ? payload.detail : null) ??
      `HTTP ${res.status}`;
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

export async function fetchBookings(roomId?: number): Promise<Booking[]> {
  const query = roomId != null ? `?room=${roomId}` : '';
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
