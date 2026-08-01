"""Audiogram-driven multiband equalization.

Designs one peaking biquad per audiogram point. Frequencies with a higher hearing
threshold receive proportionally more gain (capped), so speech energy is boosted
exactly where the user's sensitivity is weakest.
"""

from __future__ import annotations

import numpy as np
import scipy.signal
from numpy.typing import NDArray

from app.models.audio import AudioDocument
from app.models.profile import PerceptionProfile
from app.processors.base import BaseProcessor

#: Maximum boost applied to a single band, in dB.
MAX_BOOST_DB = 18.0
#: The threshold (dB HL) beyond which hearing is considered normal (no boost).
NORMAL_THRESHOLD_DB = 20.0
#: Gain per dB of hearing loss (0.5 → +5 dB for 30 dB loss).
GAIN_PER_LOSS = 0.5


def peaking_biquad(
    sample_rate: int, frequency: float, gain_db: float, q: float = 1.0
) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    """Return ``(b, a)`` coefficients for a peaking filter at ``frequency``."""
    if frequency <= 0 or frequency >= sample_rate / 2:
        return np.array([1.0]), np.array([1.0])

    a_lin = 10.0 ** (gain_db / 40.0)
    w0 = 2.0 * np.pi * frequency / sample_rate
    alpha = np.sin(w0) / (2.0 * q)

    b = np.array(
        [1.0 + alpha * a_lin, -2.0 * np.cos(w0), 1.0 - alpha * a_lin],
        dtype=np.float64,
    )
    a = np.array(
        [1.0 + alpha / a_lin, -2.0 * np.cos(w0), 1.0 - alpha / a_lin],
        dtype=np.float64,
    )
    return b, a


class EqualizerProcessor(BaseProcessor):
    """Multiband EQ shaped by the user's audiogram."""

    name = "hearing.equalization"

    def process(
        self, input: AudioDocument, profile: PerceptionProfile
    ) -> AudioDocument:
        audiogram = profile.hearing.audiogram if profile.hearing else []
        if not audiogram:
            return input

        y = input.samples.astype(np.float64, copy=True)
        sr = input.sample_rate
        applied_gains: list[dict[str, float]] = []

        for point in sorted(audiogram, key=lambda p: p.frequency):
            loss = max(point.threshold_db - NORMAL_THRESHOLD_DB, 0.0)
            gain_db = min(loss * GAIN_PER_LOSS, MAX_BOOST_DB)
            if abs(gain_db) < 0.5:
                continue
            b, a = peaking_biquad(sr, point.frequency, gain_db)
            y = scipy.signal.lfilter(b, a, y)
            applied_gains.append(
                {"frequency": point.frequency, "gain_db": round(gain_db, 2)}
            )

        input.samples = np.clip(y, -1.0, 1.0).astype(np.float32)
        input.metadata.setdefault("eq_gains", []).extend(applied_gains)
        return input
