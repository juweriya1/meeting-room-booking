# Enterprise Meeting Room Booking System

![Python](https://img.shields.io/badge/python-3.12-blue.svg)
![Django](https://img.shields.io/badge/django-5.1-green.svg)
![DRF](https://img.shields.io/badge/django--rest--framework-3.15-red.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue.svg)
![React](https://img.shields.io/badge/react-18.3-cyan.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.6-blue.svg)
![Docker](https://img.shields.io/badge/docker-compose-2496ED.svg)
![Tests](https://img.shields.io/badge/tests-21%2F21%20passing-brightgreen.svg)

A full-stack meeting room reservation system engineered to eliminate double-bookings and race conditions. Built with Django REST Framework, PostgreSQL 16, and React 18 with TypeScript.

---

## Service Endpoints & Quick Links

- **Web Dashboard:** [http://localhost:5173](http://localhost:5173)
- **REST API Base URL:** [http://localhost:8000/api/](http://localhost:8000/api/)
- **Rooms Endpoint:** [http://localhost:8000/api/rooms/](http://localhost:8000/api/rooms/)
- **Bookings Endpoint:** [http://localhost:8000/api/bookings/](http://localhost:8000/api/bookings/)
- **PostgreSQL Database:** `localhost:5432` (`meeting_room_db`, user: `postgres`)

---

## Architecture Overview

```text
+-------------------------------------------------------------+
|               React 18 + TypeScript Client                  |
|  - 2-Column Dashboard (Room Directory + Bookings Panel)     |
|  - 24-Hour Visual Schedule Timeline (Drag-to-select booking)|
|  - Canonical Timezone Selector (Localizes all UI timestamps)|
+------------------------------+------------------------------+
                               |
                               | REST API (JSON / UTC ISO 8601)
                               v
+-------------------------------------------------------------+
|               Django 5 + DRF Backend (:8000)                |
|                                                             |
|  +---------------------------+  +------------------------+  |
|  | Serializer Validation     |  | Atomic ViewSet Mutation|  |
|  | - 15-min boundary check   |  | - transaction.atomic() |  |
|  | - [15m, 24h] duration     |  | - select_for_update()  |  |
|  | - Future start_time check |  | - Overlap query check  |  |
|  +---------------------------+  +-----------+------------+  |
+---------------------------------------------|---------------+
                                              |
                                              | SQL & Row Locks
                                              v
+-------------------------------------------------------------+
|               PostgreSQL 16 Database (:5432)                |
|                                                             |
|  - Room Table (Indexed name & capacity)                     |
|  - Booking Table (start_time, end_time, status)             |
|  - ExclusionConstraint with tstzrange('[)') & btree_gist   |
|  - CheckConstraint (start_time < end_time)                  |
+-------------------------------------------------------------+
```

---

## Key Features

### Scheduling & User Interface
* **Dual Display Modes:** Toggle seamlessly between a **24-Hour Visual Schedule** timeline and an operational **Bookings List**.
* **Drag-to-Select Booking:** Click-and-drag across any room lane on the 24-hour canvas to pre-fill reservation times snapped to 15-minute marks.
* **Auto-Scroll to Earliest Meeting:** On date or room selection, the timeline automatically scrolls 90 minutes before the day's first scheduled meeting.
* **Interactive Timezone Switcher:** Dynamic dropdown supporting all 38 global UTC offsets with city search (e.g. Cairo, Tokyo, New York, Karachi), re-projecting all schedule blocks on the fly.
* **Non-Destructive Cancellation:** Soft-cancels bookings (`status = 'cancelled'`), freeing the slot immediately while archiving the record in a collapsible toggle.

### Backend & Concurrency Control
* **Atomic Row-Level Locking:** All reservations run in `transaction.atomic()` with `Room.objects.select_for_update()`, preventing Time-of-Check to Time-of-Use (TOCTOU) race conditions.
* **Database Exclusion Constraint:** Enforces `tstzrange` GiST exclusion on overlapping confirmed bookings at the PostgreSQL engine level.
* **Strict 15-Minute Slot Boundaries:** Enforces `:00`, `:15`, `:30`, or `:45` start and end minutes with minimum 15-minute and maximum 24-hour durations.
* **REST Semantic Precision:** Returns `201 Created` for confirmed bookings, `409 Conflict` for overlapping requests, and `400 Bad Request` for invalid inputs.

---

## Core Data Models

### `Room`
| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `AutoField` | Primary Key | Unique room identifier |
| `name` | `CharField(100)` | `unique=True`, Indexed | Room name (e.g., Phoenix, Orion) |
| `location` | `CharField(150)` | Required | Building floor / wing |
| `capacity` | `PositiveIntegerField` | Indexed | Maximum seating capacity |

### `Booking`
| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `AutoField` | Primary Key | Unique booking identifier |
| `room` | `ForeignKey(Room)` | `CASCADE` | Target bookable room |
| `customer_name` | `CharField(150)` | Required | Organizer full name |
| `customer_email` | `EmailField` | Required | Organizer email address |
| `start_time` | `DateTimeField` | UTC ISO 8601 | Start time (must be future, 15-min aligned) |
| `end_time` | `DateTimeField` | UTC ISO 8601 | End time (strictly after `start_time`, 15-min aligned) |
| `status` | `CharField(10)` | Enum | `'confirmed'` or `'cancelled'` (default: `'confirmed'`) |
| `created_at` | `DateTimeField` | `auto_now_add` | Creation audit timestamp |

---

## Quickstart (Docker Compose)

### 1. Start All Services
```bash
git clone https://github.com/juweriya1/meeting-room-booking.git
cd meeting-room-booking

# Build images and start PostgreSQL, Django backend, and React frontend
docker compose up --build -d
```

The database container automatically applies migrations and seeds 4 diverse rooms:
* **Phoenix** (Floor 1, Capacity: 4)
* **Orion** (Floor 2, Capacity: 8)
* **Atlas** (Floor 3, Capacity: 16)
* **Nebula** (Floor 1 Event Hall, Capacity: 30)

### 2. Stop Containers
```bash
docker compose down
```
To also purge database volumes and reset all data:
```bash
docker compose down -v
```

---

## Automated Verification & Testing

### Backend Test Suite (21 Tests in 0.22s)
Run the full test suite inside the backend container:

```bash
docker compose exec backend python manage.py test bookings --verbosity=2
```

**Coverage Breakdown:**
- **Concurrency & Race Conditions:** Verifies 3 simultaneous threads racing for the identical room and time slot result in exactly one `201 Created` and two `409 Conflict`.
- **Interval Overlaps & Boundaries:** Verifies partial overlaps, exact duplicate rejections, and back-to-back adjacent bookings (`10:00–11:00` and `11:00–12:00` accepted).
- **Slot Reclamation:** Verifies that cancelling an existing meeting immediately frees the slot for re-booking.
- **Validation Rules:** Verifies past-date rejection, 15-minute minute alignments, and duration boundaries.
- **Room API:** Verifies case-insensitive search, capacity filtering, and ordering.

### Frontend Static Analysis & Type Rig
```bash
cd frontend
npm run build
```
> Compiles with strict TypeScript compiler options (0 errors, 0 `any` types).

---

## REST API Reference

| Method | Route | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/rooms/` | List all rooms (`?search=<name>&capacity=<int>`) | `200 OK` |
| `GET` | `/api/rooms/:id/` | Retrieve single room details | `200 OK`, `404 Not Found` |
| `GET` | `/api/bookings/` | List bookings (`?room=:id&status=confirmed\|cancelled`) | `200 OK` |
| `POST` | `/api/bookings/` | Create a new booking under atomic row lock | `201 Created`, `400 Bad Request`, `409 Conflict` |
| `GET` | `/api/bookings/:id/` | Retrieve single booking details | `200 OK`, `404 Not Found` |
| `PATCH` | `/api/bookings/:id/cancel/`| Cancel an active booking and release the slot | `200 OK`, `400 Bad Request`, `404 Not Found` |

### Sample Booking Payload (`POST /api/bookings/`)
```json
{
  "room": 1,
  "customer_name": "Jane Doe",
  "customer_email": "jane@example.com",
  "start_time": "2026-11-17T10:00:00Z",
  "end_time": "2026-11-17T11:00:00Z"
}
```

---

## Project Structure

```text
meeting-room-booking/
├── docker-compose.yml         # Container orchestration (db, backend, frontend)
├── backend/
│   ├── bookings/              # Django app (models, views, serializers, tests)
│   ├── config/                # Django project configuration & root URLs
│   ├── Dockerfile
│   └── entrypoint.sh          # Auto-migration & seed data runner
├── frontend/
│   ├── src/
│   │   ├── components/        # React components (Dashboard, Timeline, Modal, etc.)
│   │   ├── hooks/             # Custom hooks (useBookingForm)
│   │   ├── api.ts             # Typed REST API client
│   │   └── types.ts           # TypeScript interfaces & date utilities
│   ├── Dockerfile
│   └── package.json
└── docs/                      # Supplementary documentation
```
