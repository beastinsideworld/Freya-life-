#!/bin/sh
set -e

mkdir -p /app/data
chown -R app:app /app/data
chmod -R u+rwX,g+rwX /app/data

if [ -f /app/data/freya.db ]; then
  chown app:app /app/data/freya.db
  chmod u+rw,g+rw /app/data/freya.db
fi

exec su -s /bin/sh app -c 'cd /app && exec dotnet Freya.Api.dll'
