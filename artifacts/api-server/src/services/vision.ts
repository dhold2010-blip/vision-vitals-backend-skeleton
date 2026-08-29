import { createHash, randomUUID } from "node:crypto";

export type DeviceStatus = "REGISTERED" | "ONLINE" | "OFFLINE" | "REVOKED" | "ERROR";
export type CaptureStatus = "RECEIVED" | "VALIDATING" | "VALID" | "INVALID" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface Device {
  id: string; ownerUserId: string; deviceIdentifier: string; deviceName: string;
  deviceType: string; status: DeviceStatus; firmwareVersion?: string;
  softwareVersion?: string; lastSeenAt?: string; createdAt: string; updatedAt: string;
  credentialHash: string; revokedAt?: string;
}
export interface Session { tokenHash: string; deviceId: string; expiresAt: number; revokedAt?: number; lastSeenAt: number; }
export interface Capture { id: string; deviceId: string; userId: string; analysisId?: string; captureType: string; status: CaptureStatus; idempotencyKey: string; createdAt: string; completedAt?: string; quality?: QualityResult; result?: AnalysisResult; }
export interface QualityResult { valid: boolean; code: "VALID" | "RECAPTURE_REQUIRED"; reasons: string[]; width?: number; height?: number; mimeType?: string; }
export interface AnalysisResult { status: "READY_FOR_REVIEW"; source: "HARDWARE_CAMERA"; disclaimer: string; }

const nowIso = () => new Date().toISOString();
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export class VisionVitalsStore {
  readonly devices = new Map<string, Device>();
  readonly sessions = new Map<string, Session>();
  readonly captures = new Map<string, Capture>();
  readonly capturesByKey = new Map<string, Capture>();
  readonly audit: Array<{ event: string; deviceId?: string; userId?: string; at: string }> = [];

  auditEvent(event: string, data: Omit<VisionVitalsStore["audit"][number], "event" | "at"> = {}) {
    this.audit.push({ event, ...data, at: nowIso() });
  }

  register(ownerUserId: string, input: { deviceIdentifier: string; deviceName: string; deviceType?: string }) {
    if ([...this.devices.values()].some((d) => d.deviceIdentifier === input.deviceIdentifier)) throw new Error("DEVICE_IDENTIFIER_EXISTS");
    const credential = `vv_${randomUUID()}_${randomUUID()}`;
    const time = nowIso();
    const device: Device = { id: randomUUID(), ownerUserId, deviceIdentifier: input.deviceIdentifier, deviceName: input.deviceName, deviceType: input.deviceType ?? "VISION_VITALS_CAMERA", status: "REGISTERED", createdAt: time, updatedAt: time, credentialHash: hash(credential) };
    this.devices.set(device.id, device);
    this.auditEvent("device.registered", { deviceId: device.id, userId: ownerUserId });
    return { device, credential };
  }

  authenticate(deviceId: string, credential: string) {
    const device = this.devices.get(deviceId);
    if (!device || device.status === "REVOKED" || device.credentialHash !== hash(credential)) {
      this.auditEvent("device.authentication_failed", { deviceId });
      throw new Error("INVALID_DEVICE_CREDENTIAL");
    }
    const token = `vvs_${randomUUID()}_${randomUUID()}`;
    const expiresAt = Date.now() + Number(process.env.DEVICE_SESSION_EXPIRE_MINUTES ?? 60) * 60_000;
    this.sessions.set(hash(token), { tokenHash: hash(token), deviceId, expiresAt, lastSeenAt: Date.now() });
    device.status = "ONLINE"; device.lastSeenAt = nowIso(); device.updatedAt = nowIso();
    this.auditEvent("device.authenticated", { deviceId, userId: device.ownerUserId });
    return { token, expiresAt: new Date(expiresAt).toISOString(), device };
  }

  session(token: string | undefined) {
    if (!token) return undefined;
    const session = this.sessions.get(hash(token));
    if (!session || session.revokedAt || session.expiresAt <= Date.now()) return undefined;
    const device = this.devices.get(session.deviceId);
    if (!device || device.status === "REVOKED") return undefined;
    return { session, device };
  }

  revoke(device: Device) {
    device.status = "REVOKED"; device.revokedAt = nowIso(); device.updatedAt = nowIso();
    for (const session of this.sessions.values()) if (session.deviceId === device.id) session.revokedAt = Date.now();
    this.auditEvent("device.revoked", { deviceId: device.id, userId: device.ownerUserId });
  }
}

export function validateImage(base64: string, mimeType: string | undefined): QualityResult {
  const maxBytes = Number(process.env.MAX_DEVICE_UPLOAD_SIZE_MB ?? 10) * 1024 * 1024;
  const bytes = Buffer.from(base64, "base64");
  const reasons: string[] = [];
  if (bytes.length === 0 || bytes.length > maxBytes) reasons.push(bytes.length > maxBytes ? "IMAGE_TOO_LARGE" : "IMAGE_EMPTY");
  const detected = bytes.subarray(0, 8);
  const isPng = detected[0] === 0x89 && detected[1] === 0x50 && detected[2] === 0x4e && detected[3] === 0x47;
  const isJpeg = detected[0] === 0xff && detected[1] === 0xd8;
  if (!isPng && !isJpeg) reasons.push("IMAGE_CORRUPTED_OR_UNSUPPORTED");
  if (mimeType && !["image/png", "image/jpeg"].includes(mimeType)) reasons.push("UNSUPPORTED_MIME_TYPE");
  return { valid: reasons.length === 0, code: reasons.length ? "RECAPTURE_REQUIRED" : "VALID", reasons, mimeType };
}

export function mockAnalyze(): AnalysisResult {
  return { status: "READY_FOR_REVIEW", source: "HARDWARE_CAMERA", disclaimer: "Image accepted by the capture pipeline. No medical measurement was fabricated; analysis requires the configured AI provider." };
}