"""AI processor tests — fake Gemini clients, never a live network call."""

from __future__ import annotations

import numpy as np

from app.models.audio import AudioDocument, ImageDocument
from app.services.hearing.processors.ai_equalizer import (
    AiEqualizerProcessor,
    coarse_spectrum_envelope,
)
from app.services.vision.processors.ai_contrast import AiContrastProcessor
from app.services.ai.gemini import _extract_json
from tests.conftest import make_profile, make_sine


class FakeGemini:
    """Stands in for GeminiClient: records calls, returns a canned JSON result."""

    model = "fake-model"

    def __init__(self, result=None):
        self.result = result
        self.calls: list[tuple] = []

    def generate_json(self, prompt: str) -> dict | None:
        self.calls.append(("text", prompt))
        return self.result

    def analyze_image_json(self, image_bytes: bytes, mime_type: str, prompt: str) -> dict | None:
        self.calls.append(("image", mime_type, len(image_bytes)))
        return self.result


def _audio() -> AudioDocument:
    return AudioDocument(samples=make_sine(sr=44100, freq=1000.0, seconds=1.0), sample_rate=44100)


def _image() -> ImageDocument:
    rng = np.random.default_rng(0)
    return ImageDocument(image=rng.integers(0, 256, (64, 64, 3), dtype=np.uint8))


def test_extract_json_handles_fences() -> None:
    assert _extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert _extract_json("not json") is None
    assert _extract_json(None) is None


def test_coarse_spectrum_envelope_is_bounded() -> None:
    env = coarse_spectrum_envelope(make_sine(sr=44100, freq=1000.0, seconds=1.0), 44100)
    assert env
    assert all(isinstance(v, float) for v in env.values())


def test_ai_equalizer_applies_gemini_gains() -> None:
    fake = FakeGemini({"bands": [{"frequency": 1000, "gain_db": 6.0}, {"frequency": 2000, "gain_db": 12.0}]})
    proc = AiEqualizerProcessor(client=fake)  # type: ignore[arg-type]
    audio = proc.process(_audio(), make_profile())

    assert audio.metadata["ai_mode"] == "gemini"
    assert len(audio.metadata["ai_gains"]) == 2
    assert len(audio.metadata["eq_gains"]) == 2
    assert fake.calls and fake.calls[0][0] == "text"
    assert "Audiogram" in fake.calls[0][1]
    assert audio.samples.dtype == np.float32
    assert float(np.max(np.abs(audio.samples))) <= 1.0


def test_ai_equalizer_rejects_out_of_range_gains() -> None:
    fake = FakeGemini({"bands": [{"frequency": 4000, "gain_db": 999.0}]})
    proc = AiEqualizerProcessor(client=fake)  # type: ignore[arg-type]
    audio = proc.process(_audio(), make_profile())

    assert audio.metadata["ai_mode"] == "gemini"
    applied = {g["frequency"]: g["gain_db"] for g in audio.metadata["ai_gains"]}
    assert applied[4000.0] <= 18.0


def test_ai_equalizer_falls_back_on_bad_result() -> None:
    proc = AiEqualizerProcessor(client=FakeGemini(result=None))  # type: ignore[arg-type]
    audio = proc.process(_audio(), make_profile())
    assert audio.metadata["ai_mode"] == "fallback"

    # rule-based EQ also populates eq_gains metadata
    assert "eq_gains" in audio.metadata


def test_ai_equalizer_falls_back_without_client(monkeypatch) -> None:
    import app.services.hearing.processors.ai_equalizer as ai_eq

    monkeypatch.setattr(ai_eq, "get_gemini_client", lambda: None)
    proc = AiEqualizerProcessor()
    audio = proc.process(_audio(), make_profile())
    assert audio.metadata["ai_mode"] == "fallback"


def test_ai_contrast_applies_gemini_params() -> None:
    fake = FakeGemini({"clip_limit": 3.2, "brightness": 1.15})
    proc = AiContrastProcessor(client=fake)  # type: ignore[arg-type]
    img = proc.process(_image(), make_profile())

    assert img.metadata["ai_mode"] == "gemini"
    assert img.metadata["contrast_clip_limit"] == 3.2
    assert img.metadata["contrast_brightness"] == 1.15
    assert fake.calls and fake.calls[0][0] == "image"
    assert img.image.shape == (64, 64, 3)


def test_ai_contrast_falls_back_on_bad_result() -> None:
    proc = AiContrastProcessor(client=FakeGemini(result={}))  # type: ignore[arg-type]
    img = proc.process(_image(), make_profile())
    assert img.metadata["ai_mode"] == "fallback"
    assert "contrast_clip_limit" in img.metadata
