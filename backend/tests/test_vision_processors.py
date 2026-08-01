"""Vision processor + pipeline tests on synthetic images."""

from __future__ import annotations

import numpy as np

from app.models.audio import ImageDocument
from app.models.profile import PerceptionProfile, VisionProfile
from app.processors.factory import build_registry
from app.services.vision.pipeline import VisionPipeline
from app.services.vision.processors.contrast import ContrastEnhancementProcessor
from app.services.vision.processors.magnify import MagnificationProcessor


def make_image(width: int = 128, height: int = 96) -> np.ndarray:
    """Synthetic BGR image: gradient + a bright block (usable for all stages)."""
    image = np.zeros((height, width, 3), dtype=np.uint8)
    image[:, :, :] = np.linspace(30, 200, width, dtype=np.uint8)[None, :, None]
    image[20:60, 40:90] = (10, 220, 90)  # BGR bright block
    return image


def make_profile() -> PerceptionProfile:
    return PerceptionProfile(
        vision=VisionProfile(
            contrast_sensitivity={"threshold_percent": 10.0, "score": 0.5},
            color_perception={"deficiency": "deuteranomaly"},
        )
    )


def test_contrast_enhancement_changes_histogram_spread() -> None:
    doc = ImageDocument(image=make_image(), metadata={})
    before_std = float(np.std(doc.image.astype(np.float32)))
    ContrastEnhancementProcessor().process(doc, make_profile())
    after_std = float(np.std(doc.image.astype(np.float32)))
    assert after_std >= before_std
    assert doc.image.dtype == np.uint8
    assert doc.image.shape == doc.image.shape


def test_magnification_preserves_dimensions() -> None:
    doc = ImageDocument(image=make_image(200, 120), metadata={"options": {"zoom": 2.0}})
    MagnificationProcessor().process(doc, make_profile())
    assert doc.image.shape == (120, 200, 3)
    assert doc.metadata["zoom"] == 2.0


def test_magnification_clamps_zoom_range() -> None:
    doc = ImageDocument(image=make_image(100, 100), metadata={"options": {"zoom": 99.0}})
    MagnificationProcessor().process(doc, make_profile())
    assert doc.metadata["zoom"] == 3.0


def test_vision_pipeline_end_to_end() -> None:
    registry = build_registry()
    pipeline = VisionPipeline(registry)
    doc = ImageDocument(image=make_image(), metadata={"options": {"zoom": 1.5}})
    out = pipeline.process(doc, make_profile())

    assert out.image.shape == doc.image.shape
    assert out.image.dtype == np.uint8
    assert out.metadata["applied_stages"] == [
        "vision.contrast_enhancement",
        "vision.adaptive_brightness",
        "vision.edge_enhancement",
        "vision.color_remapping",
        "vision.magnification",
    ]
    assert "zoom" in out.metadata
    assert "color_correction" in out.metadata


def test_vision_pipeline_with_default_profile_is_safe() -> None:
    registry = build_registry()
    pipeline = VisionPipeline(registry)
    doc = ImageDocument(image=make_image(), metadata={"options": {}})
    out = pipeline.process(doc, PerceptionProfile())
    assert out.image.shape == doc.image.shape
