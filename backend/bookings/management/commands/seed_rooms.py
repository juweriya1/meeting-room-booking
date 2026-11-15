from django.core.management.base import BaseCommand
from bookings.models import Room

SAMPLE_ROOMS = [
    {
        "name": "Phoenix",
        "location": "Floor 1 - West Wing",
        "capacity": 4,
    },
    {
        "name": "Orion",
        "location": "Floor 2 - Central",
        "capacity": 8,
    },
    {
        "name": "Atlas",
        "location": "Floor 3 - Executive Suite",
        "capacity": 16,
    },
    {
        "name": "Nebula",
        "location": "Floor 1 - Event Hall",
        "capacity": 30,
    },
]


class Command(BaseCommand):
    help = "Idempotently seed the 4 standard meeting rooms"

    def handle(self, *args, **options):
        self.stdout.write("Seeding sample meeting rooms...")
        created_count = 0
        updated_count = 0

        for room_data in SAMPLE_ROOMS:
            room, created = Room.objects.update_or_create(
                name=room_data["name"],
                defaults={
                    "location": room_data["location"],
                    "capacity": room_data["capacity"],
                },
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"  Created room: {room.name} (Capacity: {room.capacity})")
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f"  Existing room verified: {room.name} (Capacity: {room.capacity})")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeding complete: {created_count} created, {updated_count} verified/updated."
            )
        )
