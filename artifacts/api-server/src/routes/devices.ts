import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireDeviceSession, requireUser } from "../middleware/auth";
import { store } from "../store";
import { mockAnalyze, validateImage, type Capture } from "../services/vision";

const router = Router();
const registerSchema = z.object({ device_identifier: z.string().min(3).max(128), device_name: z.string().min(1).max(120), device_type: z.string().min(1).max(80).optional() });
const sensorSchema = z.object({ sensor_type: z.literal("DISTANCE"), value: z.number().finite().int().min(1).max(2000), unit: z.literal("mm"), quality: z.string().max(40).optional(), timestamp: z.coerce.date().optional() });
const captureSchema = z.object({ capture_id: z.string().min(8).max(128), image_base64: z.string().min(1), mime_type: z.string().optional(), filename: z.string().max(255).optional() });
router.post("/devices/register", requireUser, (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "INVALID_REGISTRATION", details: parsed.error.flatten() }); return; }
  try {
    const result = store.register(res.locals.userId, { deviceIdentifier: parsed.data.device_identifier, deviceName: parsed.data.device_name, deviceType: parsed.data.device_type });
    res.status(201).json({ device: { ...result.device, credentialHash: undefined }, credential: result.credential, warning: "Store this credential securely; it will not be returned again." });
  } catch (error) { res.status(409).json({ error: error instanceof Error ? error.message : "REGISTRATION_FAILED" }); }
});

router.get("/devices", requireUser, (_req, res) => {
  res.json([...store.devices.values()].filter((d) => d.ownerUserId === res.locals.userId).map(({ credentialHash: _, ...d }) => ({ ...d, status: d.status === "ONLINE" && d.lastSeenAt && Date.now() - Date.parse(d.lastSeenAt) > Number(process.env.DEVICE_HEARTBEAT_TIMEOUT_SECONDS ?? 300) * 1000 ? "OFFLINE" : d.status })));
});

router.get("/devices/:deviceId", requireUser, (req, res) => {
  const device = store.devices.get(String(req.params.deviceId));
  if (!device || device.ownerUserId !== res.locals.userId) { res.status(404).json({ error: "DEVICE_NOT_FOUND" }); return; }
  const { credentialHash: _, ...safe } = device; res.json(safe);
});

router.delete("/devices/:deviceId", requireUser, (req, res) => {
  const device = store.devices.get(String(req.params.deviceId));
  if (!device || device.ownerUserId !== res.locals.userId) { res.status(404).json({ error: "DEVICE_NOT_FOUND" }); return; }
  store.revoke(device); res.status(204).send();
});

router.post("/devices/:deviceId/authenticate", (req, res) => {
  const credential = z.object({ credential: z.string().min(10) }).safeParse(req.body);
  if (!credential.success) { res.status(400).json({ error: "INVALID_CREDENTIAL_PAYLOAD" }); return; }
  try { const result = store.authenticate(String(req.params.deviceId), credential.data.credential); res.json({ session_token: result.token, expires_at: result.expiresAt, device_id: result.device.id }); }
  catch { res.status(401).json({ error: "INVALID_DEVICE_CREDENTIAL" }); }
});

router.post("/devices/:deviceId/heartbeat", requireDeviceSession, (req, res) => {
  const device = res.locals.device; const body = z.object({ firmware_version: z.string().max(80).optional(), software_version: z.string().max(80).optional() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "INVALID_HEARTBEAT" }); return; }
  Object.assign(device, body.data, { status: "ONLINE", lastSeenAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const session = res.locals.session; session.lastSeenAt = Date.now(); res.json({ status: "ONLINE", last_seen_at: device.lastSeenAt });
});

router.get("/devices/:deviceId/status", requireUser, (req, res) => {
  const device = store.devices.get(String(req.params.deviceId));
  if (!device || device.ownerUserId !== res.locals.userId) { res.status(404).json({ error: "DEVICE_NOT_FOUND" }); return; }
  const stale = !device.lastSeenAt || Date.now() - Date.parse(device.lastSeenAt) > Number(process.env.DEVICE_HEARTBEAT_TIMEOUT_SECONDS ?? 300) * 1000;
  res.json({ device_id: device.id, status: device.status === "ONLINE" && stale ? "OFFLINE" : device.status, last_seen_at: device.lastSeenAt ?? null });
});

router.post("/devices/:deviceId/capture", requireDeviceSession, (req, res) => {
  const parsed = captureSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "INVALID_CAPTURE", details: parsed.error.flatten() }); return; }
  const duplicate = store.capturesByKey.get(parsed.data.capture_id);
  if (duplicate) { res.status(200).json({ capture: duplicate, idempotent: true }); return; }
  const deviceId = String(req.params.deviceId);
  const capture: Capture = { id: randomUUID(), deviceId, userId: res.locals.device.ownerUserId, captureType: "IMAGE", status: "VALIDATING", idempotencyKey: parsed.data.capture_id, createdAt: new Date().toISOString() };
  capture.quality = validateImage(parsed.data.image_base64, parsed.data.mime_type);
  if (!capture.quality.valid) { capture.status = "INVALID"; store.auditEvent("capture.rejected", { deviceId: capture.deviceId, userId: capture.userId }); store.captures.set(capture.id, capture); store.capturesByKey.set(capture.id, capture); store.capturesByKey.set(capture.idempotencyKey, capture); res.status(422).json({ error: "RECAPTURE_REQUIRED", capture }); return; }
  capture.status = "PROCESSING"; capture.analysisId = randomUUID(); capture.result = mockAnalyze(); capture.status = "COMPLETED"; capture.completedAt = new Date().toISOString();
  store.captures.set(capture.id, capture); store.capturesByKey.set(capture.idempotencyKey, capture); store.auditEvent("capture.submitted", { deviceId: capture.deviceId, userId: capture.userId }); res.status(201).json({ capture });
});

router.post("/devices/:deviceId/sensor-readings", requireDeviceSession, (req, res) => {
  const parsed = sensorSchema.safeParse(req.body);
  if (!parsed.success) { store.auditEvent("sensor.reading_rejected", { deviceId: String(req.params.deviceId) }); res.status(400).json({ error: "INVALID_SENSOR_READING", details: parsed.error.flatten() }); return; }
  res.status(201).json({ device_id: String(req.params.deviceId), sensor_type: parsed.data.sensor_type, value: parsed.data.value, unit: parsed.data.unit, quality: parsed.data.quality ?? "UNVERIFIED", timestamp: (parsed.data.timestamp ?? new Date()).toISOString() });
});

export default router;