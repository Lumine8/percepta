"""Shared test fixtures."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, settings
from app.main import create_app
from app.models.profile import HearingProfile, PerceptionProfile, VisionProfile
from app.storage.profile_store import ProfileStore


@pytest.fixture(autouse=True)
def _disable_ai_processors() -> None:
    """Keep tests deterministic: API/pipeline tests always use rule-based stages.

    AI processors are exercised directly in test_ai_processors.py with injected
    fake clients, so the suite never makes live Gemini calls.
    """
    settings.use_ai_processors = False


@pytest.fixture()
def client(tmp_path: Path) -> TestClient:
    """TestClient with an isolated data directory (no state leakage)."""
    app = create_app()
    app.state.profile_store = ProfileStore(Settings(data_dir=tmp_path / "data").data_dir)
    with TestClient(app) as test_client:
        yield test_client


def make_profile() -> PerceptionProfile:
    """A realistic hearing-loss profile for pipeline tests."""
    return PerceptionProfile(
        hearing=HearingProfile(
            ear="right",
            audiogram=[
                {"frequency": 125, "threshold_db": 10},
                {"frequency": 250, "threshold_db": 15},
                {"frequency": 500, "threshold_db": 20},
                {"frequency": 1000, "threshold_db": 30},
                {"frequency": 2000, "threshold_db": 45},
                {"frequency": 4000, "threshold_db": 60},
                {"frequency": 8000, "threshold_db": 65},
            ],
            average_loss_db=38.75,
            classification="moderate",
            bands={"low": "normal", "mid": "moderate", "high": "moderate"},
        ),
        vision=VisionProfile(),
    )


def make_sine(sr: int = 44100, freq: float = 1000.0, seconds: float = 1.0) -> np.ndarray:
    t = np.linspace(0, seconds, int(sr * seconds), endpoint=False)
    return (0.5 * np.sin(2 * np.pi * freq * t)).astype(np.float32)


def make_noisy_sine(
    sr: int = 44100, freq: float = 1000.0, seconds: float = 1.0, noise_db: float = -18.0
) -> np.ndarray:
    rng = np.random.default_rng(42)
    signal = make_sine(sr, freq, seconds)
    noise = rng.normal(0, 1, len(signal)).astype(np.float32)
    noise *= 10 ** (noise_db / 20) / max(float(np.sqrt(np.mean(noise**2))), 1e-9)
    return np.clip(signal + noise, -1, 1).astype(np.float32)


def make_noisy_speechlike(
    sr: int = 44100, freq: float = 1000.0, seconds: float = 2.0, noise_db: float = -12.0
) -> np.ndarray:
    """Intermittent 'speech-like' signal (tone present half the time) + noise.

    Speech has pauses, which spectral-gating denoisers rely on to estimate the
    noise floor — a continuous pure tone is a deliberately hard adversarial case.
    """
    rng = np.random.default_rng(42)
    signal = np.zeros(int(sr * seconds), dtype=np.float32)
    tone_len = int(sr * seconds / 2)
    t = np.linspace(0, seconds / 2, tone_len, endpoint=False)
    signal[:tone_len] = (0.5 * np.sin(2 * np.pi * freq * t)).astype(np.float32)
    noise = rng.normal(0, 1, len(signal)).astype(np.float32)
    noise *= 10 ** (noise_db / 20) / max(float(np.sqrt(np.mean(noise**2))), 1e-9)
    return np.clip(signal + noise, -1, 1).astype(np.float32)
