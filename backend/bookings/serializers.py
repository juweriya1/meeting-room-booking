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
        return attrs

    def to_representation(self, instance):
        """Replace room PK with nested room detail on read."""
        rep = super().to_representation(instance)
        rep['room'] = RoomSerializer(instance.room).data
        return rep
