# Vision Vitals Backend

Securely receives app and dedicated Raspberry Pi camera captures and routes
both through one validated Vision Vitals analysis pipeline.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Optional runtime env: `DEVICE_SESSION_EXPIRE_MINUTES`, `DEVICE_HEARTBEAT_TIMEOUT_SECONDS`, `MAX_DEVICE_UPLOAD_SIZE_MB`, `CORS_ORIGIN`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/services/vision.ts` — device/session/capture domain and quality boundary
- `artifacts/api-server/src/routes/devices.ts` — versioned device API
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/index.ts` and `lib/db/drizzle/0001_device_hardware.sql` — persistence model and migration
- `device/` — separate Raspberry Pi client for Picamera2 and optional VL53L0X

## Architecture decisions

- The first foundation is mock-first and in-memory so it can run without Gemini or hardware credentials; the PostgreSQL schema is ready for the persistence adapter.
- Device credentials are hashed and returned only once; device sessions are independently expiring and revocable.
- Capture idempotency uses a device-generated capture ID, not timestamps.
- User identity is currently an explicit development adapter (`x-user-id`) because the imported skeleton had no identity provider; replace it before production.

## Product

Device pairing, secure hardware sessions, heartbeat/status, image capture intake,
image quality rejection, sensor validation, and a shared analysis boundary.

## User preferences

No additional preferences recorded.

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`; Orval regenerates `lib/api-zod/src/index.ts`, so preserve the intentional API-only export if duplicate schema names appear.
- Use `localhost:80/api/...` for proxied runtime checks, not the service port directly.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
