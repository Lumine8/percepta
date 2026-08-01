"""API integration tests (TestClient)."""

from __future__ import annotations

import numpy as np
import pytest

from app.utils.audio_io import encode_wav
from tests.conftest import make_noisy_sine, make_sine

SR = 44100


def _wav_bytes(samples: np.ndarray, sr: int = SR) -> bytes:
    return encode_wav(samples, sr)


def _png_bytes() -> bytes:
    import cv2

    image = np.zeros((64, 64, 3), dtype=np.uint8)
    image[:, :, :] = (120, 120, 120)
    ok, buf = cv2.imencode(".png", image)
    assert ok
    return buf.tobytes()


def test_health(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_profile_404_when_empty(client) -> None:
    response = client.get("/profile")
    assert response.status_code == 404


def test_hearing_test_round_trip(client) -> None:
    payload = {
        "ear": "right",
        "audiogram": [
            {"frequency": 250, "threshold_db": 15},
            {"frequency": 500, "threshold_db": 20},
            {"frequency": 1000, "threshold_db": 30},
            {"frequency": 2000, "threshold_db": 40},
            {"frequency": 4000, "threshold_db": 60},
        ],
    }
    response = client.post("/hearing/test", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["classification"] in {"normal", "mild", "moderate", "severe", "profound"}
    assert body["ear"] == "right"

    profile = client.get("/profile")
    assert profile.status_code == 200
    assert profile.json()["hearing"]["audiogram"][0]["frequency"] == 250


def test_hearing_test_rejects_invalid_threshold(client) -> None:
    payload = {
        "ear": "left",
        "audiogram": [{"frequency": 1000, "threshold_db": 500}],
    }
    response = client.post("/hearing/test", json=payload)
    assert response.status_code == 422


def test_hearing_process_returns_peaks_and_audio(client) -> None:
    samples = make_noisy_sine(sr=SR, freq=1000.0, seconds=1.0, noise_db=-15.0)
    response = client.post(
        "/hearing/process",
        files={"file": ("tone.wav", _wav_bytes(samples), "audio/wav")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["duration_s"] == pytest.approx(1.0, abs=0.02)
    assert body["sample_rate"] == SR
    assert len(body["original"]["peaks"]) == len(body["processed"]["peaks"])
    assert body["original"]["peaks"][0][1] >= body["original"]["peaks"][0][0]
    assert len(body["processed_audio_b64"]) > 100
    assert "hearing.noise_reduction" in body["stages"]


def test_hearing_process_accepts_profile_json(client) -> None:
    samples = make_sine(sr=SR, freq=1000.0, seconds=0.5)
    profile = {
        "ear": "right",
        "audiogram": [
            {"frequency": 4000, "threshold_db": 70},
            {"frequency": 8000, "threshold_db": 75},
        ],
    }
    response = client.post(
        "/hearing/process",
        files={"file": ("tone.wav", _wav_bytes(samples), "audio/wav")},
        data={"profile": __import__("json").dumps(profile)},
    )
    assert response.status_code == 200
    assert "hearing.frequency_compression" in response.json()["stages"]


def test_hearing_process_rejects_bad_profile(client) -> None:
    samples = make_sine(sr=SR, freq=1000.0, seconds=0.5)
    response = client.post(
        "/hearing/process",
        files={"file": ("tone.wav", _wav_bytes(samples), "audio/wav")},
        data={"profile": "{not-json"},
    )
    assert response.status_code == 400


def test_vision_analyze_round_trip(client) -> None:
    payload = {
        "contrast": {"threshold_percent": 8.0, "trials_visible": [100, 30, 10]},
        "color": {"plates": [{"id": "rg_1", "reported": 3, "expected": 3}]},
        "acuity": {"last_readable_row": "20/25", "correct": True},
        "blind_spot": {
            "eye": "left",
            "dots_missing": [{"x": 8, "y": 0}, {"x": 12, "y": 0}],
            "viewing_distance_cm": 57,
        },
    }
    response = client.post("/vision/analyze", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["contrast_sensitivity"]["threshold_percent"] == 8.0
    assert body["acuity"]["snellen"] == "20/25"
    assert body["blind_spot"]["radius_deg"] > 0

    profile = client.get("/profile")
    assert profile.status_code == 200
    assert profile.json()["vision"]["acuity"]["snellen"] == "20/25"


def test_vision_enhance_returns_png(client) -> None:
    response = client.post(
        "/vision/enhance",
        files={"file": ("img.png", _png_bytes(), "image/png")},
        data={"options": '{"zoom": 1.5, "edge_strength": 1.0}'},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["width"] == 64
    assert body["height"] == 64
    assert body["enhanced_b64"].startswith("iVBOR")
    assert "vision.color_remapping" in body["stages"]


def test_vision_enhance_rejects_non_image(client) -> None:
    response = client.post(
        "/vision/enhance",
        files={"file": ("bad.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 400
