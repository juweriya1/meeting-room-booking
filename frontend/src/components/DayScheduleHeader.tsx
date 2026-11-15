interface Props {
  selectedDate: string;
  formattedDateTitle: string;
  totalMeetingsOnDay: number;
  selectedRoomId?: number | null;
  onShiftDate: (days: number) => void;
  onSetToday: () => void;
  onSelectDate: (date: string) => void;
  onClearRoomFilter?: () => void;
}

export default function DayScheduleHeader({
  selectedDate,
  formattedDateTitle,
  totalMeetingsOnDay,
  selectedRoomId,
  onShiftDate,
  onSetToday,
  onSelectDate,
  onClearRoomFilter,
}: Props) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '.5rem',
        background: 'var(--surface)',
        padding: '.6rem .85rem',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: '.2rem .5rem', fontSize: '.8rem' }}
          onClick={() => onShiftDate(-1)}
        >
          ◀ Prev
        </button>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: '.2rem .5rem', fontSize: '.8rem' }}
          onClick={onSetToday}
        >
          Today
        </button>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: '.2rem .5rem', fontSize: '.8rem' }}
          onClick={() => onShiftDate(1)}
        >
          Next ▶
        </button>
        <strong style={{ fontSize: '.9rem', marginLeft: '.3rem' }}>{formattedDateTitle}</strong>
        {totalMeetingsOnDay > 0 && (
          <span
            style={{
              fontSize: '.75rem',
              color: 'var(--primary)',
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              borderRadius: '12px',
              padding: '2px 8px',
              fontWeight: 600,
              marginLeft: '.3rem',
            }}
          >
            {totalMeetingsOnDay} {totalMeetingsOnDay === 1 ? 'meeting' : 'meetings'}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => e.target.value && onSelectDate(e.target.value)}
          style={{
            fontSize: '.8rem',
            padding: '.2rem .4rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--bg)',
          }}
        />
        {selectedRoomId != null && onClearRoomFilter && (
          <button
            type="button"
            className="btn-ghost"
            style={{
              fontSize: '.75rem',
              padding: '.2rem .45rem',
              color: 'var(--primary)',
              borderColor: 'var(--primary)',
            }}
            onClick={onClearRoomFilter}
          >
            ✕ Show All Rooms
          </button>
        )}
      </div>
    </div>
  );
}
