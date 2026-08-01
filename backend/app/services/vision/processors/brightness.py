"""Adaptive brightness (gamma) correction.

Analyzes the image's median luminance and applies gamma so the mid-tones land on a
comfortable target. The target is raised for users with reduced contrast
sensitivity (who benefit from a brighter overall image).
"""

from __future__ import annotations

import cv2
import numpy as np

from app.models.audio import ImageDocument
from app.models.profile import PerceptionProfile
from app.processors.base import BaseProcessor

#: Luminance target for normal vs. poor contrast sensitivity (normalized 0..1).
NORMAL_TARGET = 0.5
LOW_CONTRAST_TARGET = 0.62
#: Only correct when the image drifts beyond this deviation from target.
TOLERANCE = 0.06


class AdaptiveBrightnessProcessor(BaseProcessor):
    """Gamma-correct toward a profile-aware mid-tone luminance."""

    name = "vision.adaptive_brightness"

    def process(
        self, input: ImageDocument, profile: PerceptionProfile
    ) -> ImageDocument:
        image = input.image
        vision = profile.vision
        contrast_score = (
            vision.contrast_sensitivity.score if vision and vision.contrast_sensitivity else 1.0
        )
        target = LOW_CONTRAST_TARGET if contrast_score < 0.5 else NORMAL_TARGET

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        median = float(np.median(gray)) / 255.0

        if abs(median - target) < TOLERANCE or median <= 0.0:
            input.metadata["gamma"] = 1.0
            return input

        gamma = np.clip(np.log(target) / np.log(max(median, 1e-3)), 0.4, 2.5)
        lookup = np.array(
            [((i / 255.0) ** gamma) * 255.0 for i in range(256)], dtype=np.uint8
        )
        input.image = cv2.LUT(image, lookup)
        input.metadata["gamma"] = round(float(gamma), 3)
        input.metadata["median_luminance"] = round(median, 3)
        return input
