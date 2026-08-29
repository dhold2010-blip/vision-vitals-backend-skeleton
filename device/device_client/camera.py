from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Protocol

from PIL import Image


@dataclass(frozen=True)
class CameraConfig:
    width: int = 2304
    height: int = 1296
    jpeg_quality: int = 90


class CameraProvider(Protocol):
    def initialize(self) -> None: ...
    def capture(self) -> bytes: ...
    def validate(self, image: bytes) -> None: ...
    def close(self) -> None: ...


class RaspberryPiCameraProvider:
    """Picamera2 adapter; imports hardware dependencies only on the Pi."""

    def __init__(self, config: CameraConfig) -> None:
        self.config = config
        self._camera = None

    def initialize(self) -> None:
        from picamera2 import Picamera2  # type: ignore[import-not-found]

        self._camera = Picamera2()
        camera_config = self._camera.create_still_configuration(
            main={"size": (self.config.width, self.config.height), "format": "RGB888"}
        )
        self._camera.configure(camera_config)
        self._camera.start()

    def capture(self) -> bytes:
        if self._camera is None:
            raise RuntimeError("camera is not initialized")
        from io import BytesIO

        output = BytesIO()
        self._camera.capture_file(output, format="jpeg")
        return output.getvalue()

    def validate(self, image: bytes) -> None:
        with Image.open(BytesIO(image)) as decoded:
            decoded.verify()
            if decoded.width < 640 or decoded.height < 480:
                raise ValueError("captured image resolution is too small")

    def close(self) -> None:
        if self._camera is not None:
            self._camera.stop()
            self._camera.close()
            self._camera = None