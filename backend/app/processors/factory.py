"""Registry construction.

The app factory calls :func:`build_registry` to wire concrete processor
implementations into the registry. This is the single place to flip a stage to an
AI implementation: when ``settings.use_ai_processors`` is enabled, Gemini-backed
processors with the *same names* are registered after the rule-based ones,
shadowing them. Every stage degrades to its rule-based behavior if Gemini is
unavailable, so enabling the flag is safe even without a working API key.
"""

from __future__ import annotations

from app.core.config import settings
from app.processors.registry import ProcessorRegistry
from app.services.hearing.processors.equalizer import EqualizerProcessor
from app.services.hearing.processors.frequency_compression import (
    FrequencyCompressionProcessor,
)
from app.services.hearing.processors.frequency_transposition import (
    FrequencyTranspositionProcessor,
)
from app.services.hearing.processors.noise_reduction import (
    NoiseReductionProcessor,
)
from app.services.hearing.processors.normalization import NormalizationProcessor
from app.services.vision.processors.brightness import AdaptiveBrightnessProcessor
from app.services.vision.processors.color_remap import ColorRemappingProcessor
from app.services.vision.processors.contrast import ContrastEnhancementProcessor
from app.services.vision.processors.edge_enhance import EdgeEnhancementProcessor
from app.services.vision.processors.magnify import MagnificationProcessor


def _rule_based() -> list:
    return [
        EqualizerProcessor(),
        NoiseReductionProcessor(),
        FrequencyCompressionProcessor(),
        FrequencyTranspositionProcessor(),
        NormalizationProcessor(),
        ContrastEnhancementProcessor(),
        AdaptiveBrightnessProcessor(),
        EdgeEnhancementProcessor(),
        ColorRemappingProcessor(),
        MagnificationProcessor(),
    ]


def _ai_backed() -> list:
    """Gemini-backed replacements (same names) for a subset of stages."""
    from app.services.hearing.processors.ai_equalizer import AiEqualizerProcessor
    from app.services.vision.processors.ai_contrast import AiContrastProcessor

    return [
        AiEqualizerProcessor(),
        AiContrastProcessor(),
    ]


def build_registry() -> ProcessorRegistry:
    """Register every processing stage, optionally shadowed by AI versions."""
    registry = ProcessorRegistry()
    registry.register_many(_rule_based())
    if settings.use_ai_processors:
        registry.register_many(_ai_backed())
    return registry

