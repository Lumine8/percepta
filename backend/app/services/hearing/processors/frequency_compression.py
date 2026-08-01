"""Frequency compression for severe high-frequency hearing loss.

When the user has a steep high-frequency loss, the fricatives and consonants that
live above ~2 kHz are simply inaudible. This stage compresses that entire region
down a full octave so the spectral *shape* of speech is preserved but shifted into
the range where the user still has sensitivity.
"""

from __future__ import annotations

import numpy as np

from app.models.audio import AudioDocument
from app.models.profile import PerceptionProfile
from app.processors.base import BaseProcessor

from ._bandshift import high_band_average_loss_db, shift_band_down

#: Mean loss at 4–8 kHz above which compression is warranted (dB HL).
SEVERE_LOSS_DB = 55.0
#: Band to compress.
COMPRESS_LOW_HZ = 2000.0
COMPRESS_HIGH_HZ = 9500.0
#: Full-octave downward transposition.
COMPRESS_SEMITONES = 12.0
MIX_GAIN = 0.55


class FrequencyCompressionProcessor(BaseProcessor):
    """Compress the high-frequency band a full octave downward."""

    name = "hearing.frequency_compression"

    def process(
        self, input: AudioDocument, profile: PerceptionProfile
    ) -> AudioDocument:
        loss = high_band_average_loss_db(profile)
        if loss < SEVERE_LOSS_DB:
            return input

        y = input.samples.astype(np.float64, copy=True)
        y = shift_band_down(
            y,
            input.sample_rate,
            COMPRESS_LOW_HZ,
            COMPRESS_HIGH_HZ,
            COMPRESS_SEMITONES,
            MIX_GAIN,
        )
        input.samples = np.clip(y, -1.0, 1.0).astype(np.float32)
        input.metadata["frequency_compression"] = {
            "band_hz": [COMPRESS_LOW_HZ, COMPRESS_HIGH_HZ],
            "semitones": -COMPRESS_SEMITONES,
            "source_loss_db": round(loss, 2),
        }
        return input
