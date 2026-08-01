"""Gemini-backed contrast enhancement — replaces ``vision.contrast_enhancement``.

Sends a small thumbnail of the image plus the user's contrast sensitivity to
Gemini, which recommends a CLAHE clip limit and a brightness multiplier. The
result is applied with OpenCV (same technique as the rule-based stage).

Falls back to the rule-based :class:`ContrastEnhancementProcessor` whenever Gemini
is unavailable or its output is unusable.
"""

from __future__ import annotations

import logging

import cv2
import numpy as np

from app.models.audio import ImageDocument
from app.models.profile import PerceptionProfile
from app.processors.base import BaseProcessor
from app.services.ai.gemini import GeminiClient, get_gemini_client
from app.services.vision.processors.contrast import ContrastEnhancementProcessor
from app.utils.image_io import encode_png

logger = logging.getLogger(__name__)

#: Longest edge (px) of the thumbnail sent to Gemini.
_MAX_THUMB = 512

_PROMPT = """You are an assistive vision expert. A small thumbnail of the image and
the user's contrast sensitivity score (1.0 = healthy, lower = worse) are provided.
Recommend settings that improve perceivability for this user:
- "clip_limit": CLAHE contrast clip limit, a float in [1.5, 4.0].
- "brightness": linear brightness multiplier, a float in [0.85, 1.35].
Respond with ONLY a JSON object: {"clip_limit": <float>, "brightness": <float>}."""


def _thumbnail(image: np.ndarray) -> tuple[np.ndarray, bytes]:
    h, w = image.shape[:2]
    longest = max(h, w)
    if longest > _MAX_THUMB:
        scale = _MAX_THUMB / longest
        image = cv2.resize(
            image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA
        )
    return image, encode_png(image)


class AiContrastProcessor(BaseProcessor):
    """Gemini-reasoned CLAHE + brightness with rule-based fallback."""

    name = "vision.contrast_enhancement"

    def __init__(self, client: GeminiClient | None = None) -> None:
        self._client = client if client is not None else get_gemini_client()
        self._fallback = ContrastEnhancementProcessor()

    def process(
        self, input: ImageDocument, profile: PerceptionProfile
    ) -> ImageDocument:
        vision = profile.vision
        contrast_score = (
            vision.contrast_sensitivity.score
            if vision and vision.contrast_sensitivity
            else 1.0
        )

        if self._client is None:
            input.metadata["ai_mode"] = "fallback"
            return self._fallback.process(input, profile)

        thumb, png_bytes = _thumbnail(input.image)
        result = self._client.analyze_image_json(
            png_bytes,
            "image/png",
            f"{_PROMPT}\nContrast sensitivity: {contrast_score:.2f}",
        )
        if not result:
            input.metadata["ai_mode"] = "fallback"
            return self._fallback.process(input, profile)

        clip_limit = result.get("clip_limit")
        brightness = result.get("brightness")
        if not isinstance(clip_limit, (int, float)) or not isinstance(
            brightness, (int, float)
        ):
            input.metadata["ai_mode"] = "fallback"
            return self._fallback.process(input, profile)

        clip_limit = float(np.clip(clip_limit, 1.5, 4.0))
        brightness = float(np.clip(brightness, 0.85, 1.35))

        image = input.image
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_chan, a_chan, b_chan = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
        l_chan = clahe.apply(l_chan)
        enhanced = cv2.merge((l_chan, a_chan, b_chan))
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        if abs(brightness - 1.0) > 0.01:
            enhanced = np.clip(enhanced.astype(np.float32) * brightness, 0, 255).astype(
                np.uint8
            )

        input.image = enhanced
        input.metadata["ai_mode"] = "gemini"
        input.metadata["contrast_clip_limit"] = round(clip_limit, 2)
        input.metadata["contrast_brightness"] = round(brightness, 3)
        logger.info("AI contrast applied clip=%.2f brightness=%.2f", clip_limit, brightness)
        return input
