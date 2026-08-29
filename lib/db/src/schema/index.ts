// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types:
//
//   import { pgTable, text, serial } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const postsTable = pgTable("posts", {
//     id: serial("id").primaryKey(),
//     title: text("title").notNull(),
//   });
//
//   export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
//   export type InsertPost = z.infer<typeof insertPostSchema>;
//   export type Post = typeof postsTable.$inferSelect;

import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const devices = pgTable("devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  deviceIdentifier: text("device_identifier").notNull().unique(),
  deviceName: text("device_name").notNull(),
  deviceType: text("device_type").notNull().default("VISION_VITALS_CAMERA"),
  status: text("status").notNull().default("REGISTERED"),
  firmwareVersion: text("firmware_version"),
  softwareVersion: text("software_version"),
  credentialHash: text("credential_hash").notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const deviceSessions = pgTable("device_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  deviceId: uuid("device_id").notNull(),
  sessionIdentifier: text("session_identifier").notNull().unique(),
  sessionHash: text("session_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export const deviceCaptures = pgTable("device_captures", {
  id: uuid("id").defaultRandom().primaryKey(),
  deviceId: uuid("device_id").notNull(),
  userId: text("user_id").notNull(),
  analysisId: uuid("analysis_id"),
  captureType: text("capture_type").notNull().default("IMAGE"),
  status: text("status").notNull().default("RECEIVED"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const sensorReadings = pgTable("sensor_readings", {
  id: uuid("id").defaultRandom().primaryKey(),
  deviceId: uuid("device_id").notNull(),
  captureId: uuid("capture_id"),
  sensorType: text("sensor_type").notNull(),
  value: integer("value").notNull(),
  unit: text("unit").notNull(),
  quality: text("quality").notNull().default("UNVERIFIED"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata"),
});

export type Device = typeof devices.$inferSelect;
export type DeviceSession = typeof deviceSessions.$inferSelect;
export type DeviceCapture = typeof deviceCaptures.$inferSelect;
export type SensorReading = typeof sensorReadings.$inferSelect;