import { useState, useEffect, useCallback } from 'react';
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRooms({
        search: search || undefined,
        capacity: capacity ? Number(capacity) : undefined,
      });
      setRooms(data);
    } catch (err) {
      setError((err as ApiError).detail ?? 'Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  }, [search, capacity]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search rooms"
        />
        <input
          type="number"
          placeholder="Seats needed"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          aria-label="Seats needed"
          style={{ width: '130px', flexShrink: 0 }}
          min={1}
        />
      </div>

      {/* Loading */}
      {loading && <div className="empty-state"><span className="spinner" /> Loading rooms…</div>}

      {/* Error */}
      {!loading && error && <div className="error-banner">⚠️ {error}</div>}

      {/* Empty */}
      {!loading && !error && rooms.length === 0 && (
        <div className="empty-state">No rooms match your filters.</div>
      )}

      {/* Rooms */}
      {!loading && !error && rooms.map((room) => (
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
