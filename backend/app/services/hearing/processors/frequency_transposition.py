"""Frequency transposition for moderate high-frequency loss.

A gentler companion to compression: instead of folding the whole high band down an
octave, it transposes the upper speech-energy band (~3–7 kHz) down a few semitones
and mixes it in at low gain. This preserves timbre while nudging fricative energy
toward better sensitivity. Intended for *moderate* loss; severe loss is handled by
the compression stage.
"""

from __future__ import annotations

import numpy as np

from app.models.audio import AudioDocument
from app.models.profile import PerceptionProfile
from app.processors.base import BaseProcessor

from ._bandshift import high_band_average_loss_db, shift_band_down

#: Loss band in which transposition applies (below this: nothing needed).
MODERATE_LOSS_DB = 35.0
#: Above this, compression takes over and transposition stays quiet.
SEVERE_LOSS_DB = 55.0

TRANSPOSE_LOW_HZ = 3000.0
TRANSPOSE_HIGH_HZ = 7500.0
TRANSPOSE_SEMITONES = 4.0
MIX_GAIN = 0.4


class FrequencyTranspositionProcessor(BaseProcessor):
    """Gently transpose the upper band down for moderate high-frequency loss."""

    name = "hearing.frequency_transposition"

    def process(
        self, input: AudioDocument, profile: PerceptionProfile
    ) -> AudioDocument:
        loss = high_band_average_loss_db(profile)
        if loss < MODERATE_LOSS_DB or loss >= SEVERE_LOSS_DB:
            return input

        y = input.samples.astype(np.float64, copy=True)
        y = shift_band_down(
            y,
            input.sample_rate,
            TRANSPOSE_LOW_HZ,
            TRANSPOSE_HIGH_HZ,
            TRANSPOSE_SEMITONES,
            MIX_GAIN,
        )
        input.samples = np.clip(y, -1.0, 1.0).astype(np.float32)
        input.metadata["frequency_transposition"] = {
            "band_hz": [TRANSPOSE_LOW_HZ, TRANSPOSE_HIGH_HZ],
            "semitones": -TRANSPOSE_SEMITONES,
            "source_loss_db": round(loss, 2),
        }
        return input
