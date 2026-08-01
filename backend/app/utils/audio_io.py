"""Audio I/O helpers: decoding, encoding, and waveform peak extraction.

All audio is normalized to **mono float32** at a fixed target sample rate (44.1 kHz)
before entering the processing pipeline, and re-encoded as 16-bit PCM WAV on the way
out (a format every browser can play and the frontend can decode for waveform peaks).
"""

from __future__ import annotations

import base64
import io

import numpy as np
import scipy.io.wavfile as wavfile

TARGET_SAMPLE_RATE = 44100
_PEAK_BUCKETS = 800


def decode_audio(data: bytes, sample_rate: int = TARGET_SAMPLE_RATE) -> tuple[np.ndarray, int]:
    """Decode arbitrary audio bytes to mono float32 in [-1, 1].

    Uses ``librosa`` (which wraps soundfile + audioread) so WAV/MP3/FLAC/OGG/M4A
    all work. Raises ``ValueError`` on unreadable data.
    """
    import librosa

    try:
        y, sr = librosa.load(io.BytesIO(data), sr=sample_rate, mono=True)
    except Exception as exc:  # librosa/soundfile raise several error types
        raise ValueError(f"Could not decode audio: {exc}") from exc
    if len(y) == 0:
        raise ValueError("Audio file is empty")
    y = np.asarray(y, dtype=np.float32)
    y = np.clip(y, -1.0, 1.0)
    return y, int(sr)


def encode_wav(samples: np.ndarray, sample_rate: int) -> bytes:
    """Encode mono float32 samples to 16-bit PCM WAV bytes."""
    pcm = np.clip(samples, -1.0, 1.0)
    pcm16 = (pcm * 32767.0).astype(np.int16)
    buffer = io.BytesIO()
    wavfile.write(buffer, int(sample_rate), pcm16)
    return buffer.getvalue()


def b64_encode(data: bytes) -> str:
    """Base64-encode raw bytes (used to ship processed audio to the client)."""
    return base64.b64encode(data).decode("ascii")


def compute_peaks(samples: np.ndarray, buckets: int = _PEAK_BUCKETS) -> list[list[float]]:
    """Return downsampled ``[min, max]`` pairs per time bucket.

    Used by the frontend's custom canvas waveform renderer. Length is at most
    ``buckets`` regardless of signal length.
    """
    samples = np.asarray(samples, dtype=np.float32)
    n = len(samples)
    if n == 0:
        return []
    if n <= buckets:
        # pad to buckets so original/processed always have equal length
        step = n / buckets
        mins: list[float] = []
        maxs: list[float] = []
        for i in range(buckets):
            start = int(i * step)
            end = max(int((i + 1) * step), start + 1)
            window = samples[start:end]
            mins.append(float(window.min()))
            maxs.append(float(window.max()))
        return [[lo, hi] for lo, hi in zip(mins, maxs)]

    window = int(np.ceil(n / buckets))
    padded = np.pad(samples, (0, window * buckets - n), mode="edge")
    frames = padded.reshape(buckets, window)
    mins = frames.min(axis=1)
    maxs = frames.max(axis=1)
    return [[float(lo), float(hi)] for lo, hi in zip(mins, maxs)]
