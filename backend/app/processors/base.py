"""Common interface for every processing stage.

A processor is anything with a stable ``name`` and a ``process`` method:

.. code-block:: python

    @runtime_checkable
    class Processor(Protocol):
        name: str
        def process(self, input: Any, profile: PerceptionProfile) -> Any: ...

Contract details
----------------

- ``input``  — the artifact being processed (e.g. an :class:`AudioDocument` or
  :class:`ImageDocument`). Processors read whatever metadata they need from it.
- ``profile`` — the typed :class:`PerceptionProfile`. Processors read only the
  fields relevant to them (e.g. ``profile.hearing.audiogram``).
- output — must have the same type as ``input`` so stages compose into a chain.

Swapping rule-based → AI
------------------------
Implement a new class with the *same* ``name`` and register it in the
:class:`ProcessorRegistry` (higher priority wins). Nothing else changes.
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from app.models.profile import PerceptionProfile


@runtime_checkable
class Processor(Protocol):
    """Structural type for any pipeline stage."""

    name: str

    def process(self, input: Any, profile: PerceptionProfile) -> Any:
        """Apply this stage to ``input`` guided by the user ``profile``."""
        ...


class BaseProcessor:
    """Convenience base class; concrete stages subclass this and set ``name``."""

    name: str = ""

    def process(self, input: Any, profile: PerceptionProfile) -> Any:
        raise NotImplementedError(f"{type(self).__name__} must implement process()")
