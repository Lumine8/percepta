"""Gemini-backed equalizer — replaces ``hearing.equalization`` when AI is enabled.

Sends the user's audiogram plus a coarse spectral envelope of the incoming audio
to Gemini, which returns per-band gain recommendations. The gains are applied with
the exact same biquad filter the rule-based stage uses (``peaking_biquad``).

If Gemini is unavailable or returns unusable output, the processor silently falls
back to the rule-based :class:`EqualizerProcessor`, so the pipeline never breaks.
"""

from __future__ import annotations

import json
import logging

import numpy as np
import scipy.signal
from numpy.typing import NDArray

from app.models.audio import AudioDocument
from app.models.profile import PerceptionProfile
from app.processors.base import BaseProcessor
from app.services.ai.gemini import GeminiClient, get_gemini_client
from app.services.hearing.processors.equalizer import EqualizerProcessor, peaking_biquad

logger = logging.getLogger(__name__)

#: Bands used for the coarse spectral envelope fed to Gemini.
_ENVELOPE_BANDS_HZ = (125, 250, 500, 1000, 2000, 4000, 8000)

_SYSTEM = """You are a hearing-aid equalization expert. Given a user's audiogram
(thresholds in dB HL) and a coarse power spectrum of the incoming audio, recommend
per-band gain (dB) to apply with peaking filters. Rules:
- gain ~0 dB where threshold <= 20 dB HL (normal hearing).
- boost more where hearing loss is greater, but never less than -6 dB nor more than 18 dB.
- only use frequencies that appear in the audiogram.
Respond with ONLY a JSON object: {"bands": [{"frequency": <Hz>, "gain_db": <float>}]}."""


def coarse_spectrum_envelope(samples: np.ndarray, sample_rate: int) -> dict[str, float]:
    """Mean power per log-spaced band (dB), used to ground the AI's suggestion."""
    import scipy.signal

    if len(samples) < 256:
        return {}
    freqs, psd = scipy.signal.welch(samples, fs=sample_rate, nperseg=2048)
    psd = np.maximum(psd, 1e-12)
    envelope: dict[str, float] = {}
    for low, high in zip(_ENVELOPE_BANDS_HZ, _ENVELOPE_BANDS_HZ[1:] + (sample_rate // 2,)):
        mask = (freqs >= low) & (freqs < high)
        if np.any(mask):
            envelope[f"{low}-{high}"] = round(float(10 * np.log10(psd[mask].mean())), 1)
    return envelope


def _apply_gains(
    input: AudioDocument, gains: list[tuple[float, float]]
) -> AudioDocument:
    y = input.samples.astype(np.float64, copy=True)
    sr = input.sample_rate
    applied: list[dict[str, float]] = []
    for frequency, gain_db in gains:
        if abs(gain_db) < 0.5:
            continue
        b, a = peaking_biquad(sr, frequency, gain_db)
        y = scipy.signal.lfilter(b, a, y)
        applied.append({"frequency": float(frequency), "gain_db": round(gain_db, 2)})
    input.samples = np.clip(y, -1.0, 1.0).astype(np.float32)
    input.metadata.setdefault("eq_gains", []).extend(applied)
    return input


class AiEqualizerProcessor(BaseProcessor):
    """Gemini-reasoned multiband EQ with rule-based fallback."""

    name = "hearing.equalization"

    def __init__(self, client: GeminiClient | None = None) -> None:
        self._client = client if client is not None else get_gemini_client()
        self._fallback = EqualizerProcessor()

    def process(
        self, input: AudioDocument, profile: PerceptionProfile
    ) -> AudioDocument:
        audiogram = profile.hearing.audiogram if profile.hearing else []
        if not audiogram or self._client is None:
            input.metadata["ai_mode"] = "fallback"
            return self._fallback.process(input, profile)

        points = [{"frequency": p.frequency, "threshold_db": p.threshold_db} for p in audiogram]
        envelope = coarse_spectrum_envelope(input.samples, input.sample_rate)
        prompt = (
            f"{_SYSTEM}\nAudiogram: {json.dumps(points)}\n"
            f"Audio spectrum envelope (Hz band -> dB): {json.dumps(envelope)}"
        )

        result = self._client.generate_json(prompt)
        bands = (result or {}).get("bands")
        if not isinstance(bands, list) or not bands:
            input.metadata["ai_mode"] = "fallback"
            return self._fallback.process(input, profile)

        allowed = {p.frequency for p in audiogram}
        gains: list[tuple[float, float]] = []
        for band in bands:
            if not isinstance(band, dict):
                continue
            freq, gain = band.get("frequency"), band.get("gain_db")
            if not isinstance(freq, (int, float)) or not isinstance(gain, (int, float)):
                continue
            if int(freq) not in allowed:
                continue
            gains.append((float(freq), float(np.clip(gain, -6.0, 18.0))))

        if not gains:
            input.metadata["ai_mode"] = "fallback"
            return self._fallback.process(input, profile)

        input.metadata["ai_mode"] = "gemini"
        input.metadata["ai_gains"] = [
            {"frequency": f, "gain_db": round(g, 2)} for f, g in gains
        ]
        logger.info("AI equalizer applied %d gains (model=%s)", len(gains), self._client.model)
        return _apply_gains(input, gains)
