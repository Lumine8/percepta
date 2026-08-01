"""Shared helper for band-limited spectral remapping.

Both :class:`FrequencyCompressionProcessor` and :class:`FrequencyTranspositionProcessor`
move energy from frequency regions where the user has poor sensitivity into regions
where sensitivity is better. They share the same band-shift primitive here.
"""

from __future__ import annotations

import numpy as np
import scipy.signal
from numpy.typing import NDArray

from app.models.profile import PerceptionProfile


def shift_band_down(
    samples: NDArray[np.float64],
    sample_rate: int,
    low_hz: float,
    high_hz: float,
    semitones: float,
    mix_gain: float,
) -> NDArray[np.float64]:
    """Pitch-shift a sub-band ``[low_hz, high_hz]`` downward and mix it back.

    The sub-band is extracted with a Butterworth band-pass, transposed by
    ``semitones`` using a time-stretch + resample (scipy-only), then added back
    under the original signal with ``mix_gain`` weighting.

    Any failure (e.g. degenerate short signal) degrades to a no-op rather than
    raising — the pipeline must never crash a request because of DSP edge cases.
    """
    nyquist = sample_rate / 2.0
    high_hz = min(high_hz, nyquist * 0.95)
    low_hz = max(low_hz, 20.0)
    if high_hz <= low_hz + 50:
        return samples

    sos = scipy.signal.butter(
        4, [low_hz, high_hz], btype="band", fs=sample_rate, output="sos"
    )
    band = scipy.signal.sosfilt(sos, samples)

    # Pitch shift needs a minimum amount of signal to be meaningful.
    min_frames = int(sample_rate * 0.05)
    if len(band) < min_frames or np.max(np.abs(band)) < 1e-6:
        return samples

    try:
        # Downward pitch ratio, e.g. 12 semitones => 0.5 (one octave down).
        factor = 2.0 ** (-abs(semitones) / 12.0)
        n = len(band)
        # Stretch in time by 1/factor, then resample back to n — this shifts pitch.
        stretched = scipy.signal.resample(band, int(round(n / factor)))
        shifted = scipy.signal.resample(stretched, n)
    except Exception:
        return samples

    shifted = np.asarray(shifted, dtype=np.float64)
    if len(shifted) > len(samples):
        shifted = shifted[: len(samples)]
    elif len(shifted) < len(samples):
        shifted = np.pad(shifted, (0, len(samples) - len(shifted)))

    return samples + mix_gain * shifted


def high_band_average_loss_db(profile: PerceptionProfile) -> float:
    """Mean audiogram threshold at 4 kHz and 8 kHz (0.0 if unknown)."""
    audiogram = profile.hearing.audiogram if profile.hearing else []
    highs = [p.threshold_db for p in audiogram if p.frequency in (4000, 8000)]
    return float(np.mean(highs)) if highs else 0.0
