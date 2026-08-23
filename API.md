# Device API

All routes are under `/api/v1`. User-owned routes currently require the
development identity header `x-user-id`; replace this with managed auth before
production.

1. `POST /devices/register` with `{device_identifier, device_name, device_type?}`.
   Returns a one-time `credential`.
2. `POST /devices/{id}/authenticate` with `{credential}`. Returns an expiring
   `session_token`.
3. `POST /devices/{id}/heartbeat` with a device bearer token.
4. `POST /devices/{id}/capture` with bearer token and
   `{capture_id, image_base64, mime_type, filename?}`. Duplicate capture IDs
   return the original capture.
5. `POST /devices/{id}/sensor-readings` with bearer token and
   `{sensor_type:"DISTANCE", value, unit:"mm", timestamp?}`.
6. `GET /devices`, `GET /devices/{id}`, `GET /devices/{id}/status`, and
   `DELETE /devices/{id}` for the authenticated owner.

Invalid images return HTTP 422 with `RECAPTURE_REQUIRED`. Unsupported sensor
units, out-of-range distances, expired sessions, revoked devices, and device
mismatches are rejected.