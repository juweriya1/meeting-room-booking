import type { Room } from '../types';

interface Props {
  room: Room;
  isSelected: boolean;
  onSelect: (room: Room) => void;
  onBook: (room: Room) => void;
}

export default function RoomCard({ room, isSelected, onSelect, onBook }: Props) {
  return (
    <div
      onClick={() => onSelect(room)}
      style={{
        background: 'var(--surface)',
        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '1rem',
        cursor: 'pointer',
        boxShadow: 'var(--shadow)',
        transition: 'border-color .15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{room.name}</div>
          <div style={{ color: 'var(--muted)', fontSize: '.85rem', marginTop: '.2rem' }}>
            📍 {room.location}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
            👥 Capacity: {room.capacity}
          </div>
        </div>
        <button
          className="btn-primary"
          style={{ whiteSpace: 'nowrap', fontSize: '.85rem' }}
          onClick={(e) => { e.stopPropagation(); onBook(room); }}
        >
          Book
        </button>
      </div>
    </div>
  );
}
