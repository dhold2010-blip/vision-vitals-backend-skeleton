# Vision Vitals Raspberry Pi client

This directory is a hardware-side client for Raspberry Pi Zero 2 W and Camera
Module 3 Wide. It contains no Gemini credentials, database credentials, JWT
signing secrets, or administrative credentials.

The client is intentionally an adapter around `CameraProvider` and
`DistanceSensorProvider`. The production implementation is expected to use
Picamera2/libcamera and the VL53L0X Python library installed on Raspberry Pi
OS; this repository does not emulate hardware in production.

## Setup

```bash
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m device_client
```

Set `VV_DEVICE_CREDENTIAL` from the one-time response returned by the backend
registration endpoint. Use an `https://` backend URL in production. The client
uses bounded retries and never disables TLS verification.