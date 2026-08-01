"""Scoring unit tests."""

from __future__ import annotations

import pytest

from app.services.analysis.hearing_scoring import classify, score_hearing
from app.services.analysis.vision_scoring import (
    score_acuity,
    score_color,
    score_contrast,
    score_vision,
)


def test_classify_bands() -> None:
    assert classify(10) == "normal"
    assert classify(30) == "mild"
    assert classify(55) == "moderate"
    assert classify(80) == "severe"
    assert classify(95) == "profound"


def test_score_hearing_computes_average_and_bands() -> None:
    profile = score_hearing(
        "right",
        [
            {"frequency": 500, "threshold_db": 20},
            {"frequency": 1000, "threshold_db": 45},
            {"frequency": 2000, "threshold_db": 45},
            {"frequency": 4000, "threshold_db": 80},
        ],
    )
    assert profile.average_loss_db == 47.5
    assert profile.classification == "moderate"
    assert profile.bands["low"] == "normal"
    assert profile.bands["mid"] == "moderate"
    assert profile.bands["high"] == "severe"


def test_score_contrast_bounds() -> None:
    assert score_contrast(1.0).score == 1.0
    assert score_contrast(100.0).score == 0.0
    assert score_contrast(10.0).score == 0.5
    assert score_contrast(50.0).score == pytest.approx(0.151, abs=0.01)


def test_score_color_flags_deuteranomaly_on_confusion_plates() -> None:
    plates = [
        {"id": "rg_1", "expected": 3, "reported": 8},  # miss
        {"id": "rg_2", "expected": 7, "reported": 2},  # miss
        {"id": "rg_3", "expected": 2, "reported": 5},  # miss (> half of rg)
        {"id": "by_1", "expected": 5, "reported": 5},  # correct
    ]
    assert score_color(plates).deficiency in {"protanomaly", "deuteranomaly"}


def test_score_color_normal_when_all_correct() -> None:
    plates = [
        {"id": "rg_1", "expected": 3, "reported": 3},
        {"id": "by_1", "expected": 5, "reported": 5},
    ]
    assert score_color(plates).deficiency == "normal"


def test_score_acuity_conversion() -> None:
    acuity = score_acuity("20/25")
    assert acuity is not None
    assert acuity.logmar == 0.1
    assert acuity.decimal == 0.8


def test_score_vision_assembles_full_profile() -> None:
    vision = score_vision(
        contrast={"threshold_percent": 10.0},
        color_plates=[{"id": "rg_1", "expected": 3, "reported": 3}],
        acuity_snellen="20/30",
        blind_spot={
            "eye": "left",
            "dots_missing": [{"x": 8, "y": 0}, {"x": 10, "y": 0}, {"x": 12, "y": 0}],
            "viewing_distance_cm": 57,
        },
    )
    assert vision.contrast_sensitivity is not None
    assert vision.acuity is not None
    assert vision.acuity.snellen == "20/30"
    assert vision.blind_spot is not None
    assert vision.blind_spot.radius_deg > 0
    assert vision.color_perception.deficiency == "normal"
