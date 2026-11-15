from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from bookings.models import Room, Booking
from bookings.serializers import RoomSerializer, BookingSerializer


class RoomViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RoomSerializer

    def get_queryset(self):
        qs = Room.objects.all()
        search = self.request.query_params.get('search')
        capacity = self.request.query_params.get('capacity')
        if search:
            qs = qs.filter(name__icontains=search)
        if capacity:
            try:
                qs = qs.filter(capacity__gte=int(capacity))
            except ValueError:
                pass
        return qs


class BookingViewSet(viewsets.GenericViewSet):
    serializer_class = BookingSerializer
    queryset = Booking.objects.select_related('room').all()

    def list(self, request):
        qs = self.get_queryset().order_by('-start_time')
        room_id = request.query_params.get('room')
        if room_id:
            qs = qs.filter(room_id=room_id)
        status_param = request.query_params.get('status')
        if status_param in [Booking.Status.CONFIRMED, Booking.Status.CANCELLED]:
            qs = qs.filter(status=status_param)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        booking = self.get_object()
        return Response(self.get_serializer(booking).data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        room = serializer.validated_data['room']
        start_time = serializer.validated_data['start_time']
        end_time = serializer.validated_data['end_time']

        with transaction.atomic():
            # Acquire row-level lock on room to prevent TOCTOU race condition
            Room.objects.select_for_update().get(pk=room.pk)

            # Re-verify overlap under lock (half-open interval: [start, end))
            overlap = Booking.objects.filter(
                room=room,
                status=Booking.Status.CONFIRMED,
                start_time__lt=end_time,
                end_time__gt=start_time,
            ).exists()

            if overlap:
                return Response(
                    {'error': 'This room is already booked for the requested time slot.'},
                    status=status.HTTP_409_CONFLICT,
                )

            booking = serializer.save()

        return Response(self.get_serializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.status == Booking.Status.CANCELLED:
            return Response(
                {'error': 'Booking is already cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        booking.status = Booking.Status.CANCELLED
        booking.save(update_fields=['status'])
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)
