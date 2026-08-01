"""Processor registry.

Names are namespaced by domain, e.g. ``"hearing.noise_reduction"`` or
``"vision.contrast_enhancement"``. Pipelines look stages up by name, which is
exactly what allows an AI implementation to shadow a rule-based one later:

1. Implement ``class AiNoiseReduction(Processor)`` with
   ``name = "hearing.noise_reduction"``.
2. Call ``registry.register(AiNoiseReduction())`` (it overwrites the old entry).
3. Done — the hearing pipeline now uses the AI stage; routers/frontend are untouched.
"""

from __future__ import annotations

from collections.abc import Iterable

from app.processors.base import Processor


class ProcessorRegistry:
    """Maps processor names to their active implementations."""

    def __init__(self) -> None:
        self._processors: dict[str, Processor] = {}

    def register(self, processor: Processor) -> None:
        if not processor.name:
            raise ValueError("Cannot register a processor without a name")
        self._processors[processor.name] = processor

    def register_many(self, processors: Iterable[Processor]) -> None:
        for processor in processors:
            self.register(processor)

    def get(self, name: str) -> Processor:
        try:
            return self._processors[name]
        except KeyError as exc:
            raise KeyError(f"Unknown processor: '{name}'") from exc

    def names(self) -> list[str]:
        return sorted(self._processors)

    def __contains__(self, name: str) -> bool:
        return name in self._processors
