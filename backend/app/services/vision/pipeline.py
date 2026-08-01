"""Image enhancement pipeline.

Composes the registered ``vision.*`` processors in order over an
:class:`ImageDocument`. Like the hearing pipeline, stages are looked up by name from
the registry — enabling AI replacements without touching routers or the frontend.
"""

from __future__ import annotations

from app.models.audio import ImageDocument
from app.models.profile import PerceptionProfile
from app.processors.registry import ProcessorRegistry

#: Canonical stage order for image enhancement.
STAGES = [
    "vision.contrast_enhancement",
    "vision.adaptive_brightness",
    "vision.edge_enhancement",
    "vision.color_remapping",
    "vision.magnification",
]


class VisionPipeline:
    """Chain of registered vision processors."""

    def __init__(self, registry: ProcessorRegistry) -> None:
        self.registry = registry

    def process(
        self, input: ImageDocument, profile: PerceptionProfile
    ) -> ImageDocument:
        current = input
        applied: list[str] = []
        for stage in STAGES:
            processor = self.registry.get(stage)
            current = processor.process(current, profile)
            applied.append(stage)
        current.metadata["applied_stages"] = applied
        return current
