"""Hearing processor + pipeline tests on synthesized signals."""

from __future__ import annotations

import numpy as np
import pytest

from app.models.audio import AudioDocument
from app.models.profile import HearingProfile, PerceptionProfile
from app.processors.factory import build_registry
from app.services.hearing.pipeline import HearingPipeline
from app.services.hearing.processors.equalizer import EqualizerProcessor
from app.services.hearing.processors.noise_reduction import (
    NoiseReductionProcessor,
)
from app.services.hearing.processors.normalization import NormalizationProcessor
from tests.conftest import make_noisy_sine, make_noisy_speechlike, make_profile, make_sine

SR = 44100


def band_energy(samples: np.ndarray, low: float, high: float, sr: int = SR) -> float:
    spectrum = np.fft.rfft(samples)
    freqs = np.fft.rfftfreq(len(samples), 1 / sr)
    mask = (freqs >= low) & (freqs <= high)
    return float(np.mean(np.abs(spectrum[mask]) ** 2))


def test_equalizer_boosts_a_lossy_band() -> None:
    audio = AudioDocument(samples=make_sine(sr=SR, freq=4000.0, seconds=1.0), sample_rate=SR)
    profile = make_profile()  # 4 kHz threshold = 60 dB → strong boost
    before = band_energy(audio.samples, 3500, 4500)
    EqualizerProcessor().process(audio, profile)
    after = band_energy(audio.samples, 3500, 4500)
    assert after > before * 1.5


def test_equalizer_leaves_normal_profile_mostly_unchanged() -> None:
    audio = AudioDocument(samples=make_sine(sr=SR, freq=1000.0, seconds=1.0), sample_rate=SR)
    profile = PerceptionProfile(
        hearing=HearingProfile(audiogram=[{"frequency": 1000, "threshold_db": 10}])
    )
    EqualizerProcessor().process(audio, profile)
    assert np.max(np.abs(audio.samples)) <= 1.0


def test_noise_reduction_improves_snr() -> None:
    noisy = make_noisy_speechlike(sr=SR, freq=1000.0, seconds=2.0, noise_db=-12.0)

    def snr(s: np.ndarray) -> float:
        sig = band_energy(s, 900, 1100)
        noise = band_energy(s, 200, 800) + band_energy(s, 1500, 4000)
        return 10 * np.log10(sig / max(noise, 1e-12))

    audio = AudioDocument(samples=noisy, sample_rate=SR)
    NoiseReductionProcessor().process(audio, make_profile())
    assert snr(audio.samples) > snr(noisy)


def test_normalization_targets_peak_ceiling() -> None:
    samples = make_sine(sr=SR, freq=500.0, seconds=1.0) * 0.05  # quiet input
    audio = AudioDocument(samples=samples, sample_rate=SR)
    NormalizationProcessor().process(audio, PerceptionProfile())
    peak = float(np.max(np.abs(audio.samples)))
    assert peak <= 0.95
    rms = float(np.sqrt(np.mean(audio.samples**2)))
    assert rms > 0.01  # was amplified, not squashed


def test_hearing_pipeline_end_to_end() -> None:
    registry = build_registry()
    pipeline = HearingPipeline(registry)
    samples = make_noisy_sine(sr=SR, freq=1000.0, seconds=1.5, noise_db=-15.0)
    audio = AudioDocument(samples=samples, sample_rate=SR)
    out = pipeline.process(audio, make_profile())

    assert len(out.samples) == len(samples)
    assert out.sample_rate == SR
    assert "applied_stages" in out.metadata
    assert out.metadata["applied_stages"] == [
        "hearing.equalization",
        "hearing.noise_reduction",
        "hearing.frequency_compression",
        "hearing.frequency_transposition",
        "hearing.normalization",
    ]
    assert np.max(np.abs(out.samples)) <= 1.0


def test_pipeline_with_no_profile_is_safe() -> None:
    registry = build_registry()
    pipeline = HearingPipeline(registry)
    audio = AudioDocument(samples=make_sine(sr=SR, freq=1000.0, seconds=0.5), sample_rate=SR)
    out = pipeline.process(audio, PerceptionProfile())
    assert out.duration_s == pytest.approx(0.5, abs=0.01)
