# Vision Vitals architecture

App/web images and Raspberry Pi images both normalize into the same capture
boundary, image quality checks, `VisionAnalysisService`, AI provider, output
validation, and persistence stages. The device client owns camera setup,
capture, local validation, and HTTPS transport. The backend owns identity,
authorization, repeated validation, storage, analysis, and audit logging.

The hardware client is deliberately outside the backend package. It imports
Picamera2 and VL53L0X drivers only on the Pi and contains no server secrets.
Device credentials are hashed server-side; the registration response contains
the credential once.

Device status is derived from heartbeat activity. A device is considered
offline after `DEVICE_HEARTBEAT_TIMEOUT_SECONDS` (default 300 seconds) without
a heartbeat. Captures use a device-generated idempotency key so bounded client
retries cannot duplicate analyses.