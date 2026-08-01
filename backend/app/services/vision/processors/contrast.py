"""CLAHE-based contrast enhancement.

Adaptive histogram equalization on the lightness channel of LAB. The clip limit
scales with the user's contrast deficit: the worse their contrast sensitivity, the
stronger the local contrast boost.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.models.audio import ImageDocument
from app.models.profile import PerceptionProfile
from app.processors.base import BaseProcessor

#: CLAHE clip limits at the healthy / worst contrast endpoints.
BASE_CLIP_LIMIT = 2.0
MAX_CLIP_LIMIT = 4.0
TILE_GRID = (8, 8)


class ContrastEnhancementProcessor(BaseProcessor):
    """CLAHE on the LAB lightness channel, strength from the vision profile."""

    name = "vision.contrast_enhancement"

    def process(
        self, input: ImageDocument, profile: PerceptionProfile
    ) -> ImageDocument:
        image = input.image
        vision = profile.vision

        contrast_score = (
            vision.contrast_sensitivity.score if vision and vision.contrast_sensitivity else 1.0
        )
        # Lower contrast sensitivity → higher clip limit.
        clip_limit = BASE_CLIP_LIMIT + (1.0 - contrast_score) * (MAX_CLIP_LIMIT - BASE_CLIP_LIMIT)

        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_chan, a_chan, b_chan = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=float(clip_limit), tileGridSize=TILE_GRID)
        l_chan = clahe.apply(l_chan)
        enhanced = cv2.merge((l_chan, a_chan, b_chan))
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

        input.image = enhanced
        input.metadata["contrast_clip_limit"] = round(clip_limit, 2)
        return input
