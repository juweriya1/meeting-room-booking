/** Shared TypeScript interfaces matching the backend serializer output. */

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
