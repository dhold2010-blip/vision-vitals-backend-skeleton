# Security notes

- Production device traffic must use HTTPS; the client rejects non-HTTPS URLs
  unless `VV_ALLOW_INSECURE_DEV=true` is explicitly set for local development.
- Device requests authenticate with an expiring session token, not device ID
  alone. Revocation invalidates all sessions immediately.
- Ownership is derived from the authenticated server-side user. Device request
  bodies cannot set owner, role, or user identity.
- Uploaded images are decoded from base64 and checked against size limits and
  PNG/JPEG signatures before analysis. Filenames are metadata only and are not
  used as paths.
- Audit events intentionally exclude credentials, tokens, images, passwords,
  and AI keys.
- Gemini/API credentials must remain in backend environment configuration and
  must never be returned by device or frontend endpoints.