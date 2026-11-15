from django.db import models
from django.db.models import CheckConstraint, F, Func, Q, Value
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import RangeOperators


class Room(models.Model):
    name = models.CharField(max_length=100, unique=True, db_index=True)
    location = models.CharField(max_length=150)
    capacity = models.PositiveIntegerField(db_index=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.location}) - Capacity: {self.capacity}"


class Booking(models.Model):
    class Status(models.TextChoices):
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'

    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    customer_name = models.CharField(max_length=150)
    customer_email = models.EmailField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.CONFIRMED
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_time']
        constraints = [
            CheckConstraint(
                check=Q(start_time__lt=F('end_time')),
                name='booking_start_time_before_end_time'
            ),
            ExclusionConstraint(
                name='exclude_overlapping_confirmed_bookings',
                expressions=[
                    (
                        Func(
                            F('start_time'),
                            F('end_time'),
                            Value('[)'),
                            function='tstzrange'
                        ),
                        RangeOperators.OVERLAPS
                    ),
                    ('room', RangeOperators.EQUAL),
                ],
                condition=Q(status='confirmed'),
            ),
        ]

    def __str__(self):
        return (
            f"{self.customer_name} - {self.room.name} "
            f"({self.start_time.isoformat()} to {self.end_time.isoformat()}) "
            f"[{self.status}]"
        )
