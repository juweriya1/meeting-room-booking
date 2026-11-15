import { useState, useMemo } from 'react';
import RoomList from './components/RoomList';
import BookingList from './components/BookingList';
import BookingModal from './components/BookingModal';
import DayScheduleView from './components/DayScheduleView';
import TimezoneSelector from './components/TimezoneSelector';
import type { Room, Booking } from './types';

export default function App() {
  const detectedLocalTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    []
  );
  const [currentTimeZone, setCurrentTimeZone] = useState(detectedLocalTz);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showModal, setShowModal]       = useState(false);
  const [bookingRoomId, setBookingRoomId] = useState<number | null>(null);
  const [bookingStartTime, setBookingStartTime] = useState<string | undefined>(undefined);
  const [bookingEndTime, setBookingEndTime] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey]     = useState(0);
  const [viewMode, setViewMode]         = useState<'list' | 'schedule'>('schedule');

  const handleBook = (room: Room) => {
    setBookingRoomId(room.id);
    setBookingStartTime(undefined);
    setBookingEndTime(undefined);
    setShowModal(true);
  };

  const handleBookSlot = (roomId: number, initialStartTime?: string, initialEndTime?: string) => {
    setBookingRoomId(roomId);
    setBookingStartTime(initialStartTime);
    setBookingEndTime(initialEndTime);
    setShowModal(true);
  };

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom((prev) => (prev?.id === room.id ? null : room));
  };

  const handleModalClose = () => {
    setShowModal(false);
    setBookingRoomId(null);
    setBookingStartTime(undefined);
    setBookingEndTime(undefined);
  };

  const handleBookingCreated = (_booking: Booking) => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.4rem' }}>🏢</span>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Meeting Room Booking</h1>
        <div style={{ marginLeft: 'auto' }}>
          <TimezoneSelector
            currentTimeZone={currentTimeZone}
            onSelectTimeZone={setCurrentTimeZone}
          />
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto', minWidth: 0, overflow: 'hidden' }}>
        <section style={{ minWidth: 0 }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Rooms</h2>
          <RoomList
            selectedRoom={selectedRoom}
            onSelectRoom={handleSelectRoom}
            onBookRoom={handleBook}
          />
        </section>

        <section style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', margin: 0 }}>
              Bookings
            </h2>
            <div style={{ display: 'flex', gap: '.25rem', background: 'var(--bg)', padding: '2px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setViewMode('schedule')}
                style={{
                  fontSize: '.8rem',
                  padding: '.25rem .6rem',
                  borderRadius: 'calc(var(--radius) - 2px)',
                  background: viewMode === 'schedule' ? 'var(--surface)' : 'transparent',
                  fontWeight: viewMode === 'schedule' ? 600 : 400,
                  boxShadow: viewMode === 'schedule' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                📅 Day Schedule
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setViewMode('list')}
                style={{
                  fontSize: '.8rem',
                  padding: '.25rem .6rem',
                  borderRadius: 'calc(var(--radius) - 2px)',
                  background: viewMode === 'list' ? 'var(--surface)' : 'transparent',
                  fontWeight: viewMode === 'list' ? 600 : 400,
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                ☰ List
              </button>
            </div>
          </div>

          {viewMode === 'schedule' ? (
            <DayScheduleView
              selectedRoomId={selectedRoom?.id}
              onClearRoomFilter={() => setSelectedRoom(null)}
              onBookSlot={handleBookSlot}
              refreshTrigger={refreshKey}
              timeZone={currentTimeZone}
            />
          ) : (
            <BookingList
              filterRoomId={selectedRoom?.id}
              selectedRoomName={selectedRoom?.name}
              onClearFilter={() => setSelectedRoom(null)}
              refreshTrigger={refreshKey}
              timeZone={currentTimeZone}
            />
          )}
        </section>
      </main>

      {showModal && bookingRoomId !== null && (
        <BookingModal
          roomId={bookingRoomId}
          initialStartTime={bookingStartTime}
          initialEndTime={bookingEndTime}
          onClose={handleModalClose}
          onBookingCreated={handleBookingCreated}
          timeZone={currentTimeZone}
        />
      )}
    </>
  );
}
