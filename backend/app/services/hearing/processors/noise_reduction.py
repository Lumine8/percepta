"""Spectral-gating noise reduction.

Estimates a per-bin noise floor from the **quietest STFT frames** (lowest frame
energy), then applies a soft Wiener-style mask. Estimating from quiet frames —
rather than a global percentile — keeps stationary tonal energy (e.g. music,
continuous tones) out of the noise estimate, which is essential for speech.
A floor on the gain prevents musical noise / total dropout in speech pauses.
"""

from __future__ import annotations

import numpy as np

from app.models.audio import AudioDocument
from app.models.profile import PerceptionProfile
from app.processors.base import BaseProcessor

N_FFT = 2048
HOP_LENGTH = 512
#: Frames below this energy percentile are treated as noise-only.
QUIET_FRAME_PERCENTILE = 30
#: Exponents controlling mask softness / how aggressively noise is removed.
SOFTENING_EXPONENT = 0.7
#: Minimum gain (floor) applied to any bin — avoids musical noise bursts.
GAIN_FLOOR = 0.05


class NoiseReductionProcessor(BaseProcessor):
    """Soft spectral-gating denoiser."""

    name = "hearing.noise_reduction"

    def process(
        self, input: AudioDocument, profile: PerceptionProfile
    ) -> AudioDocument:
        import librosa

        y = np.asarray(input.samples, dtype=np.float32)
        if len(y) < N_FFT:
            return input

        stft = librosa.stft(y, n_fft=N_FFT, hop_length=HOP_LENGTH)
        magnitude = np.abs(stft)
        phase = np.angle(stft)

        frame_energy = np.mean(magnitude**2, axis=0)
        quiet_mask = frame_energy <= np.percentile(frame_energy, QUIET_FRAME_PERCENTILE)
        if not np.any(quiet_mask):
            quiet_mask[:] = True
        noise_floor = np.median(magnitude[:, quiet_mask], axis=1, keepdims=True)

        gain = (magnitude - noise_floor) / (magnitude + 1e-8)
        gain = np.clip(gain, GAIN_FLOOR, 1.0) ** SOFTENING_EXPONENT

        cleaned = librosa.istft(magnitude * gain * np.exp(1j * phase), hop_length=HOP_LENGTH)
        cleaned = np.asarray(cleaned, dtype=np.float32)

        # Preserve original length exactly.
        if len(cleaned) > len(y):
            cleaned = cleaned[: len(y)]
        elif len(cleaned) < len(y):
            cleaned = np.pad(cleaned, (0, len(y) - len(cleaned)))

        input.samples = cleaned
        input.metadata["noise_floor_db"] = round(
            float(20.0 * np.log10(np.maximum(np.max(noise_floor), 1e-9))), 2
        )
        return input
