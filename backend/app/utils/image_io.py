"""Image I/O helpers: decoding, encoding, and base64 transport."""

from __future__ import annotations

import base64
import io

import cv2
import numpy as np

_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".bmp")


def decode_image(data: bytes) -> np.ndarray:
    """Decode image bytes to a BGR ndarray (OpenCV convention)."""
    arr = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image (unsupported or corrupt file)")
    return image


def encode_png(image: np.ndarray) -> bytes:
    """Encode a BGR ndarray to PNG bytes."""
    ok, buf = cv2.imencode(".png", image)
    if not ok:
        raise ValueError("Could not encode image as PNG")
    return buf.tobytes()


def b64_encode(data: bytes) -> str:
    """Base64-encode bytes for JSON transport."""
    return base64.b64encode(data).decode("ascii")
