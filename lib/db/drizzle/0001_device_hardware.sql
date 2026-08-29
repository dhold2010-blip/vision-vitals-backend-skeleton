CREATE TABLE IF NOT EXISTS "devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" text NOT NULL,
  "device_identifier" text NOT NULL UNIQUE,
  "device_name" text NOT NULL,
  "device_type" text NOT NULL DEFAULT 'VISION_VITALS_CAMERA',
  "status" text NOT NULL DEFAULT 'REGISTERED',
  "firmware_version" text,
  "software_version" text,
  "last_seen_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "credential_hash" text NOT NULL
);
CREATE TABLE IF NOT EXISTS "device_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "device_id" uuid NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
  "session_identifier" text NOT NULL UNIQUE,
  "session_hash" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "last_seen_at" timestamptz
);
CREATE TABLE IF NOT EXISTS "device_captures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "device_id" uuid NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "analysis_id" uuid,
  "capture_type" text NOT NULL DEFAULT 'IMAGE',
  "status" text NOT NULL DEFAULT 'RECEIVED',
  "idempotency_key" text NOT NULL UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz
);
CREATE TABLE IF NOT EXISTS "sensor_readings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "device_id" uuid NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
  "capture_id" uuid,
  "sensor_type" text NOT NULL,
  "value" integer NOT NULL,
  "unit" text NOT NULL,
  "quality" text NOT NULL DEFAULT 'UNVERIFIED',
  "timestamp" timestamptz NOT NULL,
  "metadata" jsonb
);
CREATE INDEX IF NOT EXISTS "devices_owner_idx" ON "devices" ("owner_user_id");
CREATE INDEX IF NOT EXISTS "captures_device_idx" ON "device_captures" ("device_id");