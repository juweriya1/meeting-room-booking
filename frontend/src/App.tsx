import { useState, useMemo } from 'react';
import RoomList from './components/RoomList';
import BookingList from './components/BookingList';
import BookingModal from './components/BookingModal';
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
  const [refreshKey, setRefreshKey]     = useState(0);

  const handleBook = (room: Room) => {
    setBookingRoomId(room.id);
    setShowModal(true);
  };

  const handleSelectRoom = (room: Room) => {
    // Clicking selected room toggles selection off
    setSelectedRoom((prev) => (prev?.id === room.id ? null : room));
  };

  const handleModalClose = () => {
    setShowModal(false);
    setBookingRoomId(null);
  };

  const handleBookingCreated = (_booking: Booking) => {
    // Automatically trigger fresh fetch of bookings list so new meeting appears immediately
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

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <section>
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Rooms</h2>
          <RoomList
            selectedRoom={selectedRoom}
            onSelectRoom={handleSelectRoom}
            onBookRoom={handleBook}
          />
        </section>

        <section>
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Bookings</h2>
          <BookingList
            filterRoomId={selectedRoom?.id}
            selectedRoomName={selectedRoom?.name}
            onClearFilter={() => setSelectedRoom(null)}
            refreshTrigger={refreshKey}
            timeZone={currentTimeZone}
          />
        </section>
      </main>

      {showModal && bookingRoomId !== null && (
        <BookingModal
          roomId={bookingRoomId}
          onClose={handleModalClose}
          onBookingCreated={handleBookingCreated}
          timeZone={currentTimeZone}
        />
      )}
    </>
  );
}
