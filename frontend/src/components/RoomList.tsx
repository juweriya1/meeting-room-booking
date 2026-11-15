import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchRooms } from '../api';
import type { Room } from '../types';
import type { ApiError } from '../types';
import RoomCard from './RoomCard';

interface Props {
  selectedRoom: Room | null;
  onSelectRoom: (room: Room) => void;
  onBookRoom: (room: Room) => void;
}

export default function RoomList({ selectedRoom, onSelectRoom, onBookRoom }: Props) {
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [capacity, setCapacity] = useState('');
  const isInitial = useRef(true);

  const load = useCallback(async () => {
    // Only set loading true on initial load so filtering doesn't flicker/unmount existing cards
    if (isInitial.current) setLoading(true);
    setError(null);
    try {
      const data = await fetchRooms({
        search: search.trim() || undefined,
        capacity: capacity ? Number(capacity) : undefined,
      });
      setRooms(data);
    } catch (err) {
      setError((err as ApiError).detail ?? 'Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  }, [search, capacity]);

  useEffect(() => {
    if (isInitial.current) {
      void load();
      isInitial.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void load();
    }, 120);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search rooms"
          style={{ fontSize: '.88rem' }}
        />
        <input
          type="number"
          placeholder="Seats needed"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          aria-label="Seats needed"
          style={{ width: '145px', flexShrink: 0, fontSize: '.84rem', padding: '.55rem .65rem' }}
          min={1}
        />
      </div>

      {/* Initial Loading */}
      {loading && rooms.length === 0 && (
        <div className="empty-state"><span className="spinner" /> Loading rooms…</div>
      )}

      {/* Error */}
      {error && <div className="error-banner">⚠️ {error}</div>}

      {/* Empty State */}
      {!loading && !error && rooms.length === 0 && (
        <div className="empty-state">No rooms match your filters.</div>
      )}

      {/* Rooms - stays stably mounted during filter changes with zero layout flashing */}
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          isSelected={selectedRoom?.id === room.id}
          onSelect={onSelectRoom}
          onBook={onBookRoom}
        />
      ))}
    </div>
  );
}
