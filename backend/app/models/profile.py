"""Perception profile domain model.

A ``PerceptionProfile`` is the single-user source of truth that every processing
pipeline reads. It is the ``profile`` argument in the shared processor contract
``process(input, profile) -> output``.

Future AI processors must accept the exact same type, so this model is the
stability boundary between frontend, API, and processing stages.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AudiogramPoint(BaseModel):
    """A single threshold measurement at one frequency (dB HL proxy)."""

    frequency: float
    threshold_db: float = Field(ge=0, le=120)


Ear = Literal["left", "right"]
HearingClassification = Literal["normal", "mild", "moderate", "severe", "profound"]


class HearingProfile(BaseModel):
    """Result of the hearing assessment + interpretation."""

    ear: Ear = "right"
    audiogram: list[AudiogramPoint] = Field(default_factory=list)
    average_loss_db: float = 0.0
    classification: HearingClassification = "normal"
    bands: dict[str, str] = Field(default_factory=dict)
    completed_at: datetime | None = None


class ContrastSensitivityProfile(BaseModel):
    threshold_percent: float
    score: float = Field(ge=0, le=1)


ColorDeficiency = Literal["normal", "protanomaly", "deuteranomaly", "tritanomaly"]


class ColorPerceptionProfile(BaseModel):
    deficiency: ColorDeficiency = "normal"


class AcuityProfile(BaseModel):
    snellen: str
    logmar: float
    decimal: float


class BlindSpotProfile(BaseModel):
    eye: str
    center_x: float
    center_y: float
    radius_deg: float


class VisionProfile(BaseModel):
    """Result of the vision assessment battery + interpretation."""

    contrast_sensitivity: ContrastSensitivityProfile | None = None
    color_perception: ColorPerceptionProfile = Field(
        default_factory=ColorPerceptionProfile
    )
    acuity: AcuityProfile | None = None
    blind_spot: BlindSpotProfile | None = None
    completed_at: datetime | None = None


class PerceptionProfile(BaseModel):
    """The complete single-user profile consumed by all pipelines."""

    hearing: HearingProfile | None = None
    vision: VisionProfile | None = None
    generated_at: datetime | None = None
