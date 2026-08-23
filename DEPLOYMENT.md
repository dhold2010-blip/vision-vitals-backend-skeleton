# Deployment

Run the backend in Docker or a standard Node environment with the existing
API-server workflow. Provision PostgreSQL and apply
`lib/db/drizzle/0001_device_hardware.sql` through the normal migration process.
Set `PORT`, `DATABASE_URL`, `DEVICE_SESSION_EXPIRE_MINUTES`,
`DEVICE_HEARTBEAT_TIMEOUT_SECONDS`, `MAX_DEVICE_UPLOAD_SIZE_MB`, and a
restricted `CORS_ORIGIN` in the server environment.

The Raspberry Pi is not part of the backend container. Install Raspberry Pi OS
and Picamera2 on the device, configure `.env` from `device/.env.example`, and
register the device through the user-owned API. Use only an HTTPS backend URL
and keep the one-time credential in the device's protected configuration.