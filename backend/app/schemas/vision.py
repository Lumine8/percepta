"""Vision module request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.profile import VisionProfile


class ContrastFrequencyResult(BaseModel):
    cpd: float = Field(gt=0)
    threshold_percent: float = Field(gt=0, le=100)


class ContrastResult(BaseModel):
    threshold_percent: float = Field(gt=0, le=100)
    trials_visible: list[float] = Field(default_factory=list)
    frequencies: list[ContrastFrequencyResult] = Field(default_factory=list)


class ColorPlateResult(BaseModel):
    id: str
    reported: int | None = None
    expected: int | None = None


class ColorResult(BaseModel):
    plates: list[ColorPlateResult] = Field(default_factory=list)


class EyeAcuityResult(BaseModel):
    snellen: str
    logmar: float = 0.0
    correct: bool = True
    letters_shown: int = 0
    letters_correct: int = 0


class AcuityResult(BaseModel):
    last_readable_row: str | None = None
    correct: bool = True
    left: EyeAcuityResult | None = None
    right: EyeAcuityResult | None = None


class BlindSpotResult(BaseModel):
    eye: str = "left"
    dots_missing: list[dict] = Field(default_factory=list)
    viewing_distance_cm: float = 57.0


class AstigmatismResult(BaseModel):
    axis_blurred: float = Field(ge=0, lt=180)
    blur_score: float = Field(ge=0, le=1, default=0.0)
    symmetric: bool = False


class NearVisionResult(BaseModel):
    snellen: str
    correct: bool = True


class VisionAnalyzeRequest(BaseModel):
    """Raw results from the in-browser assessments."""

    contrast: ContrastResult | None = None
    color: ColorResult | None = None
    acuity: AcuityResult | None = None
    blind_spot: BlindSpotResult | None = None
    astigmatism: AstigmatismResult | None = None
    near_vision: NearVisionResult | None = None
    completed_at: str | None = None


class VisionEnhanceOptions(BaseModel):
    """Per-request tuning for the enhancement pipeline."""

    zoom: float = Field(default=1.0, ge=1.0, le=3.0)
    edge_strength: float = Field(default=0.8, ge=0.0, le=2.0)


class VisionEnhanceResponse(BaseModel):
    """Result of the image-enhancement pipeline."""

    enhanced_b64: str
    width: int
    height: int
    stages: list[str]
    meta: dict = Field(default_factory=dict)
