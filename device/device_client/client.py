from __future__ import annotations

import base64
import os
import time
import uuid
from typing import Any

import requests

from .camera import CameraProvider
from .sensor import DistanceSensorProvider


class VisionVitalsClient:
    def __init__(self, backend_url: str, device_id: str, credential: str,
                 camera: CameraProvider, sensor: DistanceSensorProvider | None = None) -> None:
        if not backend_url.startswith("https://") and os.getenv("VV_ALLOW_INSECURE_DEV") != "true":
            raise ValueError("production device communication requires HTTPS")
        self.base_url = backend_url.rstrip("/")
        self.device_id = device_id
        self.credential = credential
        self.camera = camera
        self.sensor = sensor
        self.session_token: str | None = None
        self.http = requests.Session()

    def authenticate(self) -> None:
        response = self.http.post(
            f"{self.base_url}/devices/{self.device_id}/authenticate",
            json={"credential": self.credential}, timeout=15,
        )
        response.raise_for_status()
        self.session_token = response.json()["session_token"]

    def heartbeat(self) -> None:
        self._request("POST", f"/devices/{self.device_id}/heartbeat", json={})

    def capture_once(self) -> dict[str, Any]:
        image = self.camera.capture()
        self.camera.validate(image)
        payload: dict[str, Any] = {
            "capture_id": str(uuid.uuid4()),
            "image_base64": base64.b64encode(image).decode("ascii"),
            "mime_type": "image/jpeg",
            "filename": "capture.jpg",
        }
        result = self._request("POST", f"/devices/{self.device_id}/capture", json=payload).json()
        if self.sensor is not None:
            distance = self.sensor.read_distance_mm()
            self._request(
                "POST", f"/devices/{self.device_id}/sensor-readings",
                json={"sensor_type": "DISTANCE", "value": distance, "unit": "mm"},
            )
        return result

    def _request(self, method: str, path: str, **kwargs: Any) -> requests.Response:
        if not self.session_token:
            self.authenticate()
        headers = {"Authorization": f"Bearer {self.session_token}"}
        for attempt in range(3):
            try:
                response = self.http.request(method, f"{self.base_url}{path}",
                                             headers=headers, timeout=30, **kwargs)
                if response.status_code == 401 and attempt == 0:
                    self.session_token = None
                    self.authenticate()
                    headers["Authorization"] = f"Bearer {self.session_token}"
                    continue
                if response.status_code >= 500 and attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                response.raise_for_status()
                return response
            except requests.RequestException:
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
        raise RuntimeError("request retry loop exhausted")