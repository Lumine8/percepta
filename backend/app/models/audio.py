"""In-memory artifacts passed between pipeline stages.

Pipeline stages operate on these light wrappers instead of raw numpy arrays so
that extra metadata (options, processing notes) travels with the payload without
changing the ``process(input, profile)`` signature.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np


@dataclass
class AudioDocument:
    """A mono float32 signal at a fixed sample rate."""

    samples: np.ndarray
    sample_rate: int
    metadata: dict = field(default_factory=dict)

    @property
    def duration_s(self) -> float:
        return len(self.samples) / self.sample_rate if self.sample_rate else 0.0


@dataclass
class ImageDocument:
    """A BGR image (OpenCV convention) plus request options."""

    image: np.ndarray
    metadata: dict = field(default_factory=dict)

    @property
    def width(self) -> int:
        return int(self.image.shape[1])

    @property
    def height(self) -> int:
        return int(self.image.shape[0])
