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


class ContrastFrequency(BaseModel):
    """Threshold measured at a single spatial frequency (cycles per degree)."""

    cpd: float = Field(gt=0)
    threshold_percent: float
    score: float = Field(ge=0, le=1)


class ContrastSensitivityProfile(BaseModel):
    threshold_percent: float
    score: float = Field(ge=0, le=1)
    frequencies: list[ContrastFrequency] = Field(default_factory=list)


ColorDeficiency = Literal["normal", "protanomaly", "deuteranomaly", "tritanomaly"]


class ColorPerceptionProfile(BaseModel):
    deficiency: ColorDeficiency = "normal"


class EyeAcuity(BaseModel):
    """Acuity for a single eye."""

    snellen: str
    logmar: float
    decimal: float


class AcuityProfile(BaseModel):
    """Acuity headline (best eye) plus optional per-eye detail."""

    snellen: str
    logmar: float
    decimal: float
    left: EyeAcuity | None = None
    right: EyeAcuity | None = None


class AstigmatismProfile(BaseModel):
    """Self-reported axis of most-blurred radial lines + severity proxy."""

    axis_blurred: float = Field(ge=0, lt=180)
    blur_score: float = Field(ge=0, le=1)
    symmetric: bool = False


class NearVisionProfile(BaseModel):
    """Reading-distance acuity (held ~40 cm)."""

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
    astigmatism: AstigmatismProfile | None = None
    near_vision: NearVisionProfile | None = None
    completed_at: datetime | None = None


class PerceptionProfile(BaseModel):
    """The complete single-user profile consumed by all pipelines."""

    hearing: HearingProfile | None = None
    vision: VisionProfile | None = None
    generated_at: datetime | None = None
