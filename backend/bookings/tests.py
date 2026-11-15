from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
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

    # Test 6: 3 concurrent requests for same slot → exactly 1×201, 2×409
    def test_concurrent_booking_race_condition(self):
        payload = self._payload(14, 15, days_ahead=2)

        def fire():
            client = APIClient()
            return client.post(self.base_url, payload, format="json").status_code

        with ThreadPoolExecutor(max_workers=3) as executor:
            results = [f.result() for f in as_completed([executor.submit(fire) for _ in range(3)])]

        self.assertEqual(results.count(status.HTTP_201_CREATED), 1,
                         f"Expected exactly 1×201. Got: {results}")
        self.assertEqual(results.count(status.HTTP_409_CONFLICT), 2,
                         f"Expected exactly 2×409. Got: {results}")
