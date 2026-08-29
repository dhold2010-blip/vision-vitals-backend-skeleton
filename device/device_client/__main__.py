from __future__ import annotations

import os
import time

from .camera import CameraConfig, RaspberryPiCameraProvider
from .client import VisionVitalsClient


def main() -> None:
    camera = RaspberryPiCameraProvider(CameraConfig(
        width=int(os.getenv("VV_CAMERA_WIDTH", "2304")),
        height=int(os.getenv("VV_CAMERA_HEIGHT", "1296")),
        jpeg_quality=int(os.getenv("VV_CAMERA_JPEG_QUALITY", "90")),
    ))
    client = VisionVitalsClient(
        os.environ["VV_BACKEND_URL"], os.environ["VV_DEVICE_ID"],
        os.environ["VV_DEVICE_CREDENTIAL"], camera,
    )
    camera.initialize()
    try:
        client.authenticate()
        client.heartbeat()
        interval = int(os.getenv("VV_CAPTURE_INTERVAL_SECONDS", "0"))
        if interval <= 0:
            client.capture_once()
            return
        while True:
            client.capture_once()
            time.sleep(interval)
    finally:
        camera.close()


if __name__ == "__main__":
    main()