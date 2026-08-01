"""Vision assessment interpretation.

Converts the raw assessment results (contrast, color, acuity, blind spot,
astigmatism, near vision) into a structured :class:`VisionProfile`. Heuristics
are clearly documented — this is a screening tool, not an ophthalmic diagnosis.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

from app.models.profile import (
    AcuityProfile,
    AstigmatismProfile,
    BlindSpotProfile,
    ColorDeficiency,
    ColorPerceptionProfile,
    ContrastFrequency,
    ContrastSensitivityProfile,
    EyeAcuity,
    NearVisionProfile,
    VisionProfile,
)


def _frequency_score(cpd: float, threshold_percent: float) -> float:
    """Score a single spatial-frequency threshold onto 0..1.

    Higher spatial frequencies demand lower thresholds to be "normal"; the
    threshold is normalised by a mild penalty that grows with cpd so a fine
    grating needs better contrast to score well.
    """
    threshold = max(min(threshold_percent, 100.0), 1.0)
    base = 1.0 - math.log10(threshold) / 2.0
    penalty = min(cpd / 30.0, 0.25)
    return max(0.0, min(1.0, base - penalty))


def score_contrast(
    threshold_percent: float, frequencies: list[dict] | None = None
) -> ContrastSensitivityProfile:
    """Score contrast threshold (1–100%) onto a 0..1 scale.

    `score = 1 - log10(threshold) / log10(100)`, clamped. 1% threshold → 1.0,
    100% → 0.0. Optional per-spatial-frequency thresholds are retained as detail.
    """
    threshold = max(min(threshold_percent, 100.0), 1.0)
    score = max(0.0, min(1.0, 1.0 - math.log10(threshold) / 2.0))

    freqs: list[ContrastFrequency] = []
    for freq in frequencies or []:
        cpd = max(float(freq.get("cpd", 1.0)), 0.1)
        th = max(min(float(freq.get("threshold_percent", threshold)), 100.0), 1.0)
        freqs.append(
            ContrastFrequency(
                cpd=round(cpd, 2),
                threshold_percent=round(th, 2),
                score=round(_frequency_score(cpd, th), 3),
            )
        )

    return ContrastSensitivityProfile(
        threshold_percent=round(threshold, 2),
        score=round(score, 3),
        frequencies=freqs,
    )


#: Number of expected-confusion plates per deficiency class a "normal" response
#: must NOT match in order to flag that deficiency.
_CONFUSION_PLATES = {
    "protanomaly": {"rg_1", "rg_2", "rg_3", "rg_4", "rg_5", "rg_6"},
    "deuteranomaly": {"rg_1", "rg_2", "rg_3", "rg_4", "rg_5", "rg_6"},
    "tritanomaly": {"by_1", "by_2", "by_3", "by_4"},
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


def _eye_profile(snellen: str | None) -> EyeAcuity | None:
    """Build a per-eye :class:`EyeAcuity` from a Snellen row, or None."""
    if not snellen:
        return None
    decimal = _SNELLEN_ROWS.get(snellen)
    if decimal is None:
        try:
            distance, size = snellen.split("/")
            decimal = float(size) / float(distance)  # 20/20 → 1.0
        except (ValueError, ZeroDivisionError):
            return None
    decimal = max(min(decimal, 2.0), 0.01)
    return EyeAcuity(
        snellen=snellen,
        logmar=round(math.log10(1.0 / decimal), 2),
        decimal=round(decimal, 2),
    )


def score_acuity(
    snellen: str | None,
    left: dict | None = None,
    right: dict | None = None,
) -> AcuityProfile | None:
    """Convert Snellen rows (e.g. ``"20/25"``) to logMAR + decimal acuity.

    The headline row is the best (largest decimal) of the provided eyes; per-eye
    detail is retained when available.
    """
    left_profile = _eye_profile(left.get("snellen") if left else None)
    right_profile = _eye_profile(right.get("snellen") if right else None)

    best = _eye_profile(snellen)
    if best is None:
        candidates = [p for p in (left_profile, right_profile) if p is not None]
        if candidates:
            best = max(candidates, key=lambda p: p.decimal)
    if best is None:
        return None

    return AcuityProfile(
        snellen=best.snellen,
        logmar=best.logmar,
        decimal=best.decimal,
        left=left_profile,
        right=right_profile,
    )


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


def score_astigmatism(
    axis_blurred: float, blur_score: float = 0.0, symmetric: bool = False
) -> AstigmatismProfile:
    """Store the self-reported blur axis and severity proxy.

    ``blur_score`` is the user's perceived severity (0 = none, 1 = max). The axis
    is only meaningful when blur is directional (``symmetric`` False).
    """
    axis = (float(axis_blurred) % 180.0 + 180.0) % 180.0
    return AstigmatismProfile(
        axis_blurred=round(axis, 1),
        blur_score=round(max(0.0, min(float(blur_score), 1.0)), 3),
        symmetric=bool(symmetric),
    )


def score_near_vision(snellen: str) -> NearVisionProfile | None:
    """Convert a reading-distance Snellen row to logMAR + decimal acuity."""
    profile = _eye_profile(snellen)
    if profile is None:
        return None
    return NearVisionProfile(
        snellen=profile.snellen,
        logmar=profile.logmar,
        decimal=profile.decimal,
    )


def score_vision(
    contrast: dict | None,
    color_plates: list[dict],
    acuity_snellen: str | None,
    blind_spot: dict | None,
    acuity: dict | None = None,
    astigmatism: dict | None = None,
    near_vision: dict | None = None,
    completed_at: datetime | None = None,
) -> VisionProfile:
    """Assemble a complete :class:`VisionProfile` from raw assessment data."""
    vision = VisionProfile(completed_at=completed_at or datetime.now(timezone.utc))

    if contrast and contrast.get("threshold_percent") is not None:
        vision.contrast_sensitivity = score_contrast(
            float(contrast["threshold_percent"]),
            frequencies=contrast.get("frequencies"),
        )

    vision.color_perception = score_color(color_plates or [])

    acuity_row = acuity_snellen or (acuity or {}).get("last_readable_row")
    vision.acuity = score_acuity(
        acuity_row,
        left=(acuity or {}).get("left"),
        right=(acuity or {}).get("right"),
    )

    if blind_spot:
        vision.blind_spot = score_blind_spot(
            blind_spot.get("eye", "left"),
            blind_spot.get("dots_missing", []),
            blind_spot.get("viewing_distance_cm", 57.0),
        )

    if astigmatism:
        vision.astigmatism = score_astigmatism(
            astigmatism.get("axis_blurred", 0.0),
            astigmatism.get("blur_score", 0.0),
            astigmatism.get("symmetric", False),
        )

    if near_vision and near_vision.get("snellen"):
        vision.near_vision = score_near_vision(str(near_vision["snellen"]))

    return vision
