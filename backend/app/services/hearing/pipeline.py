"""Hearing adaptation pipeline.

Composes the registered ``hearing.*`` processors in order over an
:class:`AudioDocument`. The stage list is data-driven: stages are looked up by name
from the registry, so enabling an AI replacement for any stage is a registry change
only.
"""

from __future__ import annotations

from app.models.audio import AudioDocument
from app.models.profile import PerceptionProfile
from app.processors.registry import ProcessorRegistry

#: Canonical stage order for speech adaptation.
STAGES = [
    "hearing.equalization",
    "hearing.noise_reduction",
    "hearing.frequency_compression",
    "hearing.frequency_transposition",
    "hearing.normalization",
]


class HearingPipeline:
    """Chain of registered hearing processors."""

    def __init__(self, registry: ProcessorRegistry) -> None:
        self.registry = registry

    def process(
        self, input: AudioDocument, profile: PerceptionProfile
    ) -> AudioDocument:
        current = input
        applied: list[str] = []
        for stage in STAGES:
            processor = self.registry.get(stage)
            current = processor.process(current, profile)
            applied.append(stage)
        current.metadata["applied_stages"] = applied
        return current
