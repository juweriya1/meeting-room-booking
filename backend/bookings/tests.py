from django.utils import timezone
from rest_framework.test import APITestCase, APITransactionTestCase, APIClient
from rest_framework import status
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import timedelta

from bookings.models import Room, Booking


def make_dt(hour, minute=0, days_ahead=1):
    """Return a timezone-aware UTC datetime at HH:MM, days_ahead from now."""
    return timezone.now().replace(
        hour=hour, minute=minute, second=0, microsecond=0
    ) + timedelta(days=days_ahead)


class BookingBusinessRuleTests(APITestCase):

    def setUp(self):
        self.room = Room.objects.create(
            name="Test Room", location="Floor 1", capacity=10
        )
        self.base_url = "/api/bookings/"
        self.cancel_url = lambda pk: f"/api/bookings/{pk}/cancel/"

    def _payload(self, start_hour, end_hour, days_ahead=1, start_minute=0, end_minute=0):
        return {
            "room": self.room.pk,
            "customer_name": "Jane Doe",
            "customer_email": "jane@example.com",
            "start_time": make_dt(start_hour, minute=start_minute, days_ahead=days_ahead).isoformat(),
            "end_time": make_dt(end_hour, minute=end_minute, days_ahead=days_ahead).isoformat(),
        }

    def _seed_booking(self, start_hour, end_hour):
        return Booking.objects.create(
            room=self.room,
            customer_name="Seed User",
            customer_email="seed@example.com",
            start_time=make_dt(start_hour),
            end_time=make_dt(end_hour),
            status=Booking.Status.CONFIRMED,
        )

    # Test 1: Overlapping booking → 409
    def test_overlap_rejection(self):
        self._seed_booking(10, 11)
        response = self.client.post(
            self.base_url,
            self._payload(10, 11, start_minute=30, end_minute=30),  # 10:30–11:30
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    # Test 2: Exact duplicate → 409
    def test_exact_duplicate_rejection(self):
        self._seed_booking(10, 11)
        response = self.client.post(self.base_url, self._payload(10, 11), format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    # Test 3: Adjacent bookings (strict half-open interval) → both 201
    def test_adjacent_bookings_accepted(self):
        self._seed_booking(10, 11)
        resp_after = self.client.post(self.base_url, self._payload(11, 12), format="json")
        self.assertEqual(resp_after.status_code, status.HTTP_201_CREATED)
        resp_before = self.client.post(self.base_url, self._payload(9, 10), format="json")
        self.assertEqual(resp_before.status_code, status.HTTP_201_CREATED)

    # Test 4: Cancelled booking frees the slot → 201
    def test_cancelled_booking_frees_slot(self):
        booking = self._seed_booking(10, 11)
        cancel_resp = self.client.patch(self.cancel_url(booking.pk), format="json")
        self.assertEqual(cancel_resp.status_code, status.HTTP_200_OK)
        rebook_resp = self.client.post(self.base_url, self._payload(10, 11), format="json")
        self.assertEqual(rebook_resp.status_code, status.HTTP_201_CREATED)

    # Test 5: start_time >= end_time → 400
    def test_start_must_be_before_end(self):
        response = self.client.post(
            self.base_url,
            self._payload(11, 10),  # end before start
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # Test 7: Booking duration < 15 minutes → 400
    def test_minimum_duration_15_minutes_rejected(self):
        response = self.client.post(
            self.base_url,
            self._payload(10, 10, start_minute=0, end_minute=10),  # 10 minutes
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("at least 15 minutes", str(response.data))

    # Test 8: Booking duration = 15 minutes (aligned) → 201
    def test_minimum_duration_15_minutes_accepted(self):
        response = self.client.post(
            self.base_url,
            self._payload(10, 10, start_minute=0, end_minute=15),  # 15 minutes
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # Test 9: Unaligned start time (e.g. 10:07) → 400
    def test_unaligned_start_time_rejected(self):
        response = self.client.post(
            self.base_url,
            self._payload(10, 11, start_minute=7, end_minute=0),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("15-minute boundary", str(response.data))

    # Test 10: Unaligned end time (e.g. 11:23) → 400
    def test_unaligned_end_time_rejected(self):
        response = self.client.post(
            self.base_url,
            self._payload(10, 11, start_minute=0, end_minute=23),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("15-minute boundary", str(response.data))

    # Test 11: Booking duration > 24 hours → 400
    def test_maximum_duration_exceeded_rejected(self):
        response = self.client.post(
            self.base_url,
            self._payload(10, 11, days_ahead=1),
            format="json",
        )
        # Modify end_time to be 25 hours later
        payload = self._payload(10, 11, days_ahead=1)
        payload["end_time"] = (make_dt(10, days_ahead=1) + timedelta(hours=25)).isoformat()
        response = self.client.post(self.base_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot exceed 24 hours", str(response.data))

    # Test 12: Filter bookings by status=confirmed
    def test_filter_by_status_confirmed(self):
        confirmed = self._seed_booking(10, 11)
        cancelled = Booking.objects.create(
            room=self.room,
            customer_name="Cancelled User",
            customer_email="cancelled@example.com",
            start_time=make_dt(12),
            end_time=make_dt(13),
            status=Booking.Status.CANCELLED,
        )
        response = self.client.get(f"{self.base_url}?status=confirmed")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [b["id"] for b in response.data]
        self.assertIn(confirmed.id, returned_ids)
        self.assertNotIn(cancelled.id, returned_ids)

    # Test 13: Filter bookings by status=cancelled
    def test_filter_by_status_cancelled(self):
        confirmed = self._seed_booking(10, 11)
        cancelled = Booking.objects.create(
            room=self.room,
            customer_name="Cancelled User",
            customer_email="cancelled@example.com",
            start_time=make_dt(12),
            end_time=make_dt(13),
            status=Booking.Status.CANCELLED,
        )
        response = self.client.get(f"{self.base_url}?status=cancelled")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [b["id"] for b in response.data]
        self.assertIn(cancelled.id, returned_ids)
        self.assertNotIn(confirmed.id, returned_ids)




class BookingConcurrencyTests(APITransactionTestCase):
    """
    Uses APITransactionTestCase so that setUp data is committed to the real
    database and is visible to worker threads (which open their own connections).
    All assertions are identical to the original Test 6 specification.
    """

    def setUp(self):
        self.room = Room.objects.create(
            name="Concurrency Room", location="Floor 2", capacity=10
        )
        self.base_url = "/api/bookings/"

    def _payload(self, start_hour, end_hour, days_ahead=1, start_minute=0, end_minute=0):
        return {
            "room": self.room.pk,
            "customer_name": "Jane Doe",
            "customer_email": "jane@example.com",
            "start_time": make_dt(start_hour, minute=start_minute, days_ahead=days_ahead).isoformat(),
            "end_time": make_dt(end_hour, minute=end_minute, days_ahead=days_ahead).isoformat(),
        }

    # Test 6: 3 concurrent requests for same slot → exactly 1×201, 2×409
    def test_concurrent_booking_race_condition(self):
        payload = self._payload(14, 15, days_ahead=2)

        def fire():
            from django.db import connection
            client = APIClient()
            result = client.post(self.base_url, payload, format="json").status_code
            connection.close()  # release thread-local DB connection so teardown can DROP DATABASE
            return result

        with ThreadPoolExecutor(max_workers=3) as executor:
            results = [f.result() for f in as_completed([executor.submit(fire) for _ in range(3)])]

        self.assertEqual(results.count(status.HTTP_201_CREATED), 1,
                         f"Expected exactly 1×201. Got: {results}")
        self.assertEqual(results.count(status.HTTP_409_CONFLICT), 2,
                         f"Expected exactly 2×409. Got: {results}")
