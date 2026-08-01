"""Vision assessment interpretation.

Converts the four raw assessment results (contrast, color, acuity, blind spot) into
a structured :class:`VisionProfile`. Heuristics are clearly documented — this is a
screening tool, not an ophthalmic diagnosis.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

from app.models.profile import (
    AcuityProfile,
    BlindSpotProfile,
    ColorDeficiency,
    ColorPerceptionProfile,
    ContrastSensitivityProfile,
    VisionProfile,
)


def score_contrast(threshold_percent: float) -> ContrastSensitivityProfile:
    """Score contrast threshold (1–100%) onto a 0..1 scale.

    `score = 1 - log10(threshold) / log10(100)`, clamped. 1% threshold → 1.0,
    100% → 0.0.
    """
    threshold = max(min(threshold_percent, 100.0), 1.0)
    score = max(0.0, min(1.0, 1.0 - math.log10(threshold) / 2.0))
    return ContrastSensitivityProfile(
        threshold_percent=round(threshold, 2), score=round(score, 3)
    )


#: Number of expected-confusion plates per deficiency class a "normal" response
#: must NOT match in order to flag that deficiency.
_CONFUSION_PLATES = {
    "protanomaly": {"rg_1", "rg_2", "rg_3"},
    "deuteranomaly": {"rg_1", "rg_2", "rg_3"},
    "tritanomaly": {"by_1", "by_2"},
}


def score_color(plates: list[dict]) -> ColorPerceptionProfile:
    """Classify color perception from plate responses.

    A response is a "confusion" if the user's reported digit does not match the
    expected digit on a plate designed to catch that deficiency. If a user misses
    the expected digit on more than half of a class's plates, that class is flagged.
    """
    if not plates:
        return ColorPerceptionProfile()

    misses: dict[str, int] = {key: 0 for key in _CONFUSION_PLATES}
    totals: dict[str, int] = {key: 0 for key in _CONFUSION_PLATES}

    for plate in plates:
        pid = plate.get("id", "")
        expected = plate.get("expected")
        reported = plate.get("reported")
        for deficiency, ids in _CONFUSION_PLATES.items():
            if pid in ids:
                totals[deficiency] += 1
                if expected is not None and reported != expected:
                    misses[deficiency] += 1

    for deficiency in _CONFUSION_PLATES:
        total = totals[deficiency]
        if total > 0 and misses[deficiency] > total / 2:
            return ColorPerceptionProfile(deficiency=deficiency)  # type: ignore[arg-type]

    return ColorPerceptionProfile(deficiency="normal")


#: Decimal acuity for each Snellen row the frontend can present.
_SNELLEN_ROWS = {
    "20/200": 0.1,
    "20/100": 0.2,
    "20/70": 0.29,
    "20/50": 0.4,
    "20/40": 0.5,
    "20/30": 0.67,
    "20/25": 0.8,
    "20/20": 1.0,
    "20/16": 1.25,
}


def score_acuity(snellen: str) -> AcuityProfile | None:
    """Convert a Snellen row (e.g. ``"20/25"``) to logMAR + decimal acuity."""
    decimal = _SNELLEN_ROWS.get(snellen)
    if decimal is None:
        try:
            distance, size = snellen.split("/")
            decimal = float(size) / float(distance)  # 20/20 → 1.0
        except (ValueError, ZeroDivisionError):
            return None
    decimal = max(min(decimal, 2.0), 0.01)
    logmar = round(math.log10(1.0 / decimal), 2)
    return AcuityProfile(snellen=snellen, logmar=logmar, decimal=round(decimal, 2))


def score_blind_spot(
    eye: str, dots_missing: list[dict], viewing_distance_cm: float
) -> BlindSpotProfile | None:
    """Fit the reported missing dots to a circle and convert to visual angle.

    Assumes a grid in centimeters relative to a fixation center; 57 cm viewing
    distance ≈ 1 cm per degree of visual angle. Missing dots are averaged for the
    center; radius is the mean distance of the dots from that center.
    """
    if not dots_missing:
        return None

    xs = [d.get("x", 0.0) for d in dots_missing]
    ys = [d.get("y", 0.0) for d in dots_missing]
    cx = sum(xs) / len(xs)
    cy = sum(ys) / len(ys)

    distance_cm = max(float(viewing_distance_cm), 10.0)
    cm_per_deg = distance_cm / 57.0
    radius = sum(math.hypot(x - cx, y - cy) for x, y in zip(xs, ys)) / len(xs)

    return BlindSpotProfile(
        eye=eye,
        center_x=round(cx, 2),
        center_y=round(cy, 2),
        radius_deg=round(radius / cm_per_deg, 2),
    )


def score_vision(
    contrast: dict | None,
    color_plates: list[dict],
    acuity_snellen: str | None,
    blind_spot: dict | None,
    completed_at: datetime | None = None,
) -> VisionProfile:
    """Assemble a complete :class:`VisionProfile` from raw assessment data."""
    vision = VisionProfile(completed_at=completed_at or datetime.now(timezone.utc))

    if contrast and contrast.get("threshold_percent") is not None:
        vision.contrast_sensitivity = score_contrast(
            float(contrast["threshold_percent"])
        )

    vision.color_perception = score_color(color_plates or [])

    if acuity_snellen:
        vision.acuity = score_acuity(acuity_snellen)

    if blind_spot:
        vision.blind_spot = score_blind_spot(
            blind_spot.get("eye", "left"),
            blind_spot.get("dots_missing", []),
            blind_spot.get("viewing_distance_cm", 57.0),
        )

    return vision
