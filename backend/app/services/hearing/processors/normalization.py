"""Loudness + peak normalization.

Normalizes the processed signal to a target loudness (RMS-based approximation of
perceptual loudness for the MVP) and then soft-limits so the final render never
clips. This is always the last stage in the chain.
"""

from __future__ import annotations

import numpy as np

from app.models.audio import AudioDocument
from app.models.profile import PerceptionProfile
from app.processors.base import BaseProcessor

#: Target loudness in dBFS RMS (approximation of a −23 LUFS dialogue target).
TARGET_LOUDNESS_DB = -23.0
#: Maximum gain we will apply to reach the target (avoids pumping silence up).
MAX_GAIN_DB = 30.0
#: Final peak ceiling (dBFS).
PEAK_CEILING = -1.0


class NormalizationProcessor(BaseProcessor):
    """RMS-loudness normalize, then soft-limit to a peak ceiling."""

    name = "hearing.normalization"

    def process(
        self, input: AudioDocument, profile: PerceptionProfile
    ) -> AudioDocument:
        y = np.asarray(input.samples, dtype=np.float64)
        rms = float(np.sqrt(np.mean(y**2)))
        gain = 10.0 ** (TARGET_LOUDNESS_DB / 20.0) / max(rms, 1e-9)
        gain = min(gain, 10.0 ** (MAX_GAIN_DB / 20.0))

        y = y * gain

        ceiling = 10.0 ** (PEAK_CEILING / 20.0)  # ≈ 0.891
        peak = float(np.max(np.abs(y)))
        if peak > ceiling:
            y = y * (ceiling / peak)

        input.samples = y.astype(np.float32)
        input.metadata["target_loudness_db"] = TARGET_LOUDNESS_DB
        input.metadata["peak_db"] = round(
            float(20.0 * np.log10(np.max(np.abs(input.samples)) + 1e-9)), 2
        )
        return input
