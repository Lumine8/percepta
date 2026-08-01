"""Schemas shared across modules."""

from __future__ import annotations

from pydantic import BaseModel, Field


class WaveformPeaks(BaseModel):
    """Downsampled min/max pairs for custom-canvas waveform rendering."""

    peaks: list[list[float]] = Field(
        default_factory=list,
        description="[[min, max], ...] per time bucket",
    )
