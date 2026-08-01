"""Hearing module request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.profile import AudiogramPoint, Ear, HearingProfile
from app.schemas.common import WaveformPeaks


class HearingTestRequest(BaseModel):
    """A completed hearing assessment, as produced by the in-browser tone test."""

    ear: Ear = "right"
    audiogram: list[AudiogramPoint] = Field(min_length=1)
    completed_at: str | None = None


class HearingProcessResponse(BaseModel):
    """Result of the speech-adaptation pipeline."""

    duration_s: float
    sample_rate: int
    original: WaveformPeaks
    processed: WaveformPeaks
    processed_audio_b64: str
    stages: list[str]
    meta: dict = Field(default_factory=dict)
