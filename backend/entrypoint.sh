#!/bin/sh
set -e

echo "Waiting for database connection..."
python - << 'EOF'
import socket
import time
import os

host = os.environ.get("DB_HOST", "db")
port = int(os.environ.get("DB_PORT", 5432))
start_time = time.time()

while True:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.0)
        sock.connect((host, port))
        sock.close()
        print(f"Connected to database at {host}:{port}")
        break
    except (socket.error, OSError):
        time.sleep(0.5)
        if time.time() - start_time > 30:
            print(f"Timed out waiting for database at {host}:{port}")
            break
EOF

echo "Applying database migrations..."
python manage.py migrate --noinput

if python manage.py help seed_rooms > /dev/null 2>&1; then
    echo "Running room seed command..."
    python manage.py seed_rooms
fi

exec "$@"
