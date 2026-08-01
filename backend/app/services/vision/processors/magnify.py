"""Magnification.

Upscales the image to the requested zoom with high-quality interpolation, then
center-crops back to the original aspect ratio. The crop keeps the side-by-side
compare slider perfectly aligned (same pixel dimensions on both sides) while the
content inside is magnified.
"""

from __future__ import annotations

import cv2

from app.models.audio import ImageDocument
from app.models.profile import PerceptionProfile
from app.processors.base import BaseProcessor

MIN_ZOOM = 1.0
MAX_ZOOM = 3.0
INTERPOLATION = cv2.INTER_CUBIC


class MagnificationProcessor(BaseProcessor):
    """Zoom into the image (1×–3×), preserving output dimensions."""

    name = "vision.magnification"

    def process(
        self, input: ImageDocument, profile: PerceptionProfile
    ) -> ImageDocument:
        options = input.metadata.get("options", {})
        zoom = float(options.get("zoom", 1.0))
        zoom = min(max(zoom, MIN_ZOOM), MAX_ZOOM)

        image = input.image
        h, w = image.shape[:2]
        if zoom > 1.0:
            nw, nh = int(round(w * zoom)), int(round(h * zoom))
            resized = cv2.resize(image, (nw, nh), interpolation=INTERPOLATION)
            # Center crop back to original dimensions.
            x0 = (nw - w) // 2
            y0 = (nh - h) // 2
            image = resized[y0 : y0 + h, x0 : x0 + w]

        input.image = image
        input.metadata["zoom"] = round(zoom, 2)
        return input
