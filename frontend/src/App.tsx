import { useState } from 'react';
import RoomList from './components/RoomList';
import BookingList from './components/BookingList';
import BookingModal from './components/BookingModal';
import type { Room } from './types';

export default function App() {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showModal, setShowModal]       = useState(false);
  const [bookingRoomId, setBookingRoomId] = useState<number | null>(null);

  const handleBook = (room: Room) => {
    setBookingRoomId(room.id);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setBookingRoomId(null);
  };

  return (
    <>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '1.4rem' }}>🏢</span>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Meeting Room Booking</h1>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <section>
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Rooms</h2>
          <RoomList
            selectedRoom={selectedRoom}
            onSelectRoom={setSelectedRoom}
            onBookRoom={handleBook}
          />
        </section>

        <section>
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Bookings</h2>
          <BookingList filterRoomId={selectedRoom?.id} />
        </section>
      </main>

      {showModal && bookingRoomId !== null && (
        <BookingModal
          roomId={bookingRoomId}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
