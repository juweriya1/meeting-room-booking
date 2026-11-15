from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from bookings.models import Room, Booking


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'name', 'location', 'capacity']
        read_only_fields = fields


class BookingSerializer(serializers.ModelSerializer):
    # Write: accept room PK. Read: return nested room detail.
    room = serializers.PrimaryKeyRelatedField(queryset=Room.objects.all())

    class Meta:
        model = Booking
        fields = [
            'id', 'room', 'customer_name', 'customer_email',
            'start_time', 'end_time', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def validate(self, attrs):
        start = attrs.get('start_time')
        end = attrs.get('end_time')

        if start and end:
            if start >= end:
                raise serializers.ValidationError(
                    {'end_time': 'end_time must be strictly after start_time.'}
                )
            if start <= timezone.now():
                raise serializers.ValidationError(
                    {'start_time': 'start_time must be in the future.'}
                )
            duration = end - start
            if duration < timedelta(minutes=15):
                raise serializers.ValidationError(
                    {'end_time': 'Booking duration must be at least 15 minutes.'}
                )
            if duration > timedelta(hours=24):
                raise serializers.ValidationError(
                    {'end_time': 'Booking duration cannot exceed 24 hours.'}
                )
            if start.minute % 15 != 0 or start.second != 0 or start.microsecond != 0:
                raise serializers.ValidationError(
                    {'start_time': 'Start time must be aligned to a 15-minute boundary (e.g. :00, :15, :30, :45).'}
                )
            if end.minute % 15 != 0 or end.second != 0 or end.microsecond != 0:
                raise serializers.ValidationError(
                    {'end_time': 'End time must be aligned to a 15-minute boundary (e.g. :00, :15, :30, :45).'}
                )
        return attrs

    def to_representation(self, instance):
        """Replace room PK with nested room detail on read."""
        rep = super().to_representation(instance)
        rep['room'] = RoomSerializer(instance.room).data
        return rep
