"""Hearing assessment interpretation.

Converts raw audiogram thresholds into a structured :class:`HearingProfile` with a
BTA (best-tone average over 500–4k Hz), an overall classification, and a per-band
interpretation. This is *screening* — thresholds are dB-HL proxies, not a clinical
diagnosis.
"""

from __future__ import annotations

from datetime import datetime, timezone

import numpy as np

from app.models.profile import (
    AudiogramPoint,
    HearingClassification,
    HearingProfile,
)

#: Standard audiometric frequency set.
STANDARD_FREQUENCIES = (125, 250, 500, 1000, 2000, 4000, 8000)

#: (frequency range, band key)
BANDS: list[tuple[tuple[float, float], str]] = [
    ((125, 500), "low"),
    ((1000, 2000), "mid"),
    ((4000, 8000), "high"),
]

#: Frequency average used for the overall classification.
BTA_FREQUENCIES = (500, 1000, 2000, 4000)


def classify(average_loss_db: float) -> HearingClassification:
    if average_loss_db <= 20:
        return "normal"
    if average_loss_db <= 40:
        return "mild"
    if average_loss_db <= 70:
        return "moderate"
    if average_loss_db <= 90:
        return "severe"
    return "profound"


def _band_classification(losses: list[float]) -> str:
    return classify(float(np.mean(losses))) if losses else "normal"


def score_hearing(
    ear: str,
    audiogram: list[AudiogramPoint],
    completed_at: datetime | None = None,
) -> HearingProfile:
    """Interpret a completed hearing assessment."""
    # Accept both pydantic models and plain dicts (robust to direct calls).
    points = sorted(
        (AudiogramPoint.model_validate(p) for p in audiogram),
        key=lambda p: p.frequency,
    )
    thresholds = {int(p.frequency): p.threshold_db for p in points}

    bta_values = [thresholds[f] for f in BTA_FREQUENCIES if f in thresholds]
    average_loss = float(np.mean(bta_values)) if bta_values else 0.0

    bands: dict[str, str] = {}
    for (low, high), key in BANDS:
        losses = [
            v for f, v in thresholds.items() if low <= f <= high
        ]
        bands[key] = _band_classification(losses)

    return HearingProfile(
        ear=ear,
        audiogram=points,
        average_loss_db=round(average_loss, 1),
        classification=classify(average_loss),
        bands=bands,
        completed_at=completed_at or datetime.now(timezone.utc),
    )
