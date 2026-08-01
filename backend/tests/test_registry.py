"""Unit tests for the shared processor contract and registry."""

from __future__ import annotations

from app.models.audio import AudioDocument
from app.models.profile import PerceptionProfile
from app.processors.base import BaseProcessor
from app.processors.factory import build_registry
from app.processors.registry import ProcessorRegistry


def test_registry_registers_rule_based_stages() -> None:
    registry = build_registry()
    names = registry.names()
    assert "hearing.equalization" in names
    assert "hearing.noise_reduction" in names
    assert "hearing.frequency_compression" in names
    assert "hearing.frequency_transposition" in names
    assert "hearing.normalization" in names
    assert "vision.contrast_enhancement" in names
    assert "vision.adaptive_brightness" in names
    assert "vision.edge_enhancement" in names
    assert "vision.color_remapping" in names
    assert "vision.magnification" in names


def test_registry_can_overwrite_a_stage_with_an_ai_implementation() -> None:
    """The AI-swap seam: same name, new implementation, no other changes."""
    registry = build_registry()
    calls: list[str] = []

    class AiNoiseReduction(BaseProcessor):
        name = "hearing.noise_reduction"

        def process(self, input: AudioDocument, profile: PerceptionProfile):
            calls.append("ai-noise-reduction")
            return input

    registry.register(AiNoiseReduction())
    processor = registry.get("hearing.noise_reduction")
    result = processor.process(
        AudioDocument(samples=__import__("numpy").zeros(100), sample_rate=44100),
        PerceptionProfile(),
    )
    assert calls == ["ai-noise-reduction"]
    assert isinstance(result, AudioDocument)


def test_unknown_processor_raises() -> None:
    registry = ProcessorRegistry()
    try:
        registry.get("does.not.exist")
        raise AssertionError("expected KeyError")
    except KeyError:
        pass


def test_register_without_name_raises() -> None:
    registry = ProcessorRegistry()
    try:
        registry.register(BaseProcessor())  # name is ""
        raise AssertionError("expected ValueError")
    except ValueError:
        pass
