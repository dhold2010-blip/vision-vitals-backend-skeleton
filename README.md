# Vision Vitals Backend

Production-oriented backend foundation for Vision Vitals: app and dedicated
Raspberry Pi camera captures enter one validated analysis pipeline. The
backend is the security boundary; hardware never receives AI or database
credentials.

## What is included

- Versioned device API under `/api/v1/devices`
- Hashed one-time device credentials and expiring/revocable device sessions
- Strict owner and device-session authorization
- Heartbeat/last-seen status with configurable offline timeout
- Idempotent capture intake with MIME, size, signature, and corruption checks
- Basic image quality service returning `RECAPTURE_REQUIRED` when unsupported
- VL53L0X distance-reading contract with range/unit validation
- Shared mock analysis boundary; Gemini remains server-side and can be added
  behind the same provider interface
- PostgreSQL schema and migration for devices, sessions, captures, and readings
- Separate `device/` Raspberry Pi client for Picamera2 and optional VL53L0X

The current user authentication adapter uses `x-user-id` as a development
boundary because the imported skeleton has no user identity provider yet.
Replace that adapter with the project's managed auth middleware before exposing
user routes publicly. No local JWT system is introduced.

## Run

```bash
pnpm install
PORT=5000 pnpm --filter @workspace/api-server run dev
curl http://localhost:80/api/healthz
```

`DATABASE_URL` is required only when using the Drizzle database package or
applying the PostgreSQL migration. The default mock-first capture path does not
fabricate medical measurements and runs without Gemini credentials.