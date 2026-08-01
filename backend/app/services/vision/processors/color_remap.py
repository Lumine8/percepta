"""Color remapping for color perception deficiencies.

For users with a color deficiency, applies a **daltonize-style** correction:

1. Transform RGB → LMS cone responses.
2. Simulate what the deficient eye sees (Brettel et al. dichromacy models).
3. Push the original image away from the simulated image so the channels the user
   cannot separate become distinguishable.

For users with normal color perception a gentle saturation boost is applied instead.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.models.audio import ImageDocument
from app.models.profile import PerceptionProfile
from app.processors.base import BaseProcessor

# RGB -> LMS cone responses (Smith & Pokorny 1975, as used in common
# daltonize implementations).
RGB_TO_LMS = np.array(
    [
        [0.31399022, 0.63951294, 0.04649755],
        [0.15537241, 0.75789446, 0.08670142],
        [0.01775239, 0.10944209, 0.87256922],
    ],
    dtype=np.float64,
)
LMS_TO_RGB = np.linalg.inv(RGB_TO_LMS)

# Brettel et al. 1997 dichromacy simulations (operate on LMS).
SIMULATION = {
    "protanomaly": lambda l, m, s: (2.02344 * m - 2.52581 * s, m, s),
    "deuteranomaly": lambda l, m, s: (l, 0.494207 * l + 1.24827 * s, s),
    "tritanomaly": lambda l, m, s: (l, m, -0.395913 * l + 0.801109 * m),
}

#: How strongly the correction pushes colors apart.
CORRECTION_GAIN = 0.9
#: Gentle saturation boost for normal color perception.
NORMAL_SATURATION_BOOST = 1.08


def _daltonize(image: np.ndarray, deficiency: str) -> np.ndarray:
    rgb = image[:, :, ::-1].astype(np.float64) / 255.0  # BGR -> RGB, 0..1
    flat = rgb.reshape(-1, 3)

    lms = flat @ RGB_TO_LMS.T
    l, m, s = lms[:, 0], lms[:, 1], lms[:, 2]
    sim_l, sim_m, sim_s = SIMULATION[deficiency](l, m, s)
    sim_lms = np.stack([sim_l, sim_m, sim_s], axis=1)

    corrected_lms = lms + CORRECTION_GAIN * (lms - sim_lms)
    corrected_rgb = corrected_lms @ LMS_TO_RGB.T
    corrected_rgb = np.clip(corrected_rgb, 0.0, 1.0)

    bgr = corrected_rgb[:, ::-1].reshape(image.shape)
    return (bgr * 255.0).astype(np.uint8)


def _saturate(image: np.ndarray, factor: float) -> np.ndarray:
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * factor, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)


class ColorRemappingProcessor(BaseProcessor):
    """Correct or enhance colors based on the vision profile."""

    name = "vision.color_remapping"

    def process(
        self, input: ImageDocument, profile: PerceptionProfile
    ) -> ImageDocument:
        vision = profile.vision
        deficiency = vision.color_perception.deficiency if vision else "normal"

        if deficiency in SIMULATION:
            input.image = _daltonize(input.image, deficiency)
            input.metadata["color_correction"] = f"daltonize:{deficiency}"
        else:
            input.image = _saturate(input.image, NORMAL_SATURATION_BOOST)
            input.metadata["color_correction"] = f"saturation:{NORMAL_SATURATION_BOOST}"
        return input
