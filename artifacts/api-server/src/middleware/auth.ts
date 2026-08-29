import type { RequestHandler } from "express";
import { store } from "../store";

export const requireUser: RequestHandler = (req, res, next) => {
  const userId = req.header("x-user-id");
  if (!userId) { res.status(401).json({ error: "USER_AUTHENTICATION_REQUIRED" }); return; }
  res.locals.userId = String(userId); next();
};

export const requireDeviceSession: RequestHandler = (req, res, next) => {
  const auth = req.header("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  const result = store.session(token);
  if (!result) { res.status(401).json({ error: "INVALID_OR_EXPIRED_DEVICE_SESSION" }); return; }
  if (result.device.id !== String(req.params.deviceId)) { res.status(403).json({ error: "DEVICE_MISMATCH" }); return; }
  res.locals.device = result.device; res.locals.session = result.session; next();
};

export const ownership: RequestHandler = (_req, res, next) => {
  const device = res.locals.device;
  if (device && device.ownerUserId !== res.locals.userId) { res.status(403).json({ error: "DEVICE_OWNERSHIP_REQUIRED" }); return; }
  next();
};