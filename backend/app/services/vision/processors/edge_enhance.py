"""Unsharp-mask edge enhancement.

Sharpens edges via the classic unsharp mask: subtract a blurred copy, then add the
difference back scaled by ``amount``. Strength comes from the request options
(``edge_strength``, default derived from the profile's contrast deficit).
"""

from __future__ import annotations

import cv2

from app.models.audio import ImageDocument
from app.models.profile import PerceptionProfile
from app.processors.base import BaseProcessor

DEFAULT_AMOUNT = 0.8
MAX_AMOUNT = 1.6
SIGMA = 2.0


class EdgeEnhancementProcessor(BaseProcessor):
    """Unsharp masking with profile/option-driven strength."""

    name = "vision.edge_enhancement"

    def process(
        self, input: ImageDocument, profile: PerceptionProfile
    ) -> ImageDocument:
        options = input.metadata.get("options", {})
        amount = float(options.get("edge_strength", DEFAULT_AMOUNT))
        amount = min(max(amount, 0.0), MAX_AMOUNT)

        image = input.image
        blurred = cv2.GaussianBlur(image, (0, 0), SIGMA)
        sharpened = cv2.addWeighted(image, 1.0 + amount, blurred, -amount, 0)

        input.image = sharpened
        input.metadata["edge_amount"] = round(amount, 2)
        return input
