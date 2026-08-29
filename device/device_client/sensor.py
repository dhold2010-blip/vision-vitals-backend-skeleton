from __future__ import annotations

from typing import Protocol


class DistanceSensorProvider(Protocol):
    def read_distance_mm(self) -> int: ...


class VL53L0XDistanceSensor:
    def __init__(self) -> None:
        self._sensor = None

    def initialize(self) -> None:
        import board  # type: ignore[import-not-found]
        import busio  # type: ignore[import-not-found]
        import adafruit_vl53l0x  # type: ignore[import-not-found]

        self._sensor = adafruit_vl53l0x.VL53L0X(busio.I2C(board.SCL, board.SDA))

    def read_distance_mm(self) -> int:
        if self._sensor is None:
            raise RuntimeError("distance sensor is not initialized")
        value = int(self._sensor.range)
        if not 1 <= value <= 2000:
            raise ValueError("distance reading is outside the supported range")
        return value