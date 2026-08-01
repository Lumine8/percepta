"""Single-user profile persistence to a JSON file.

No authentication in the MVP, so the backend manages exactly one
:class:`PerceptionProfile` at ``<data_dir>/profile.json``.

Swapping this for a real database later is contained: the :class:`ProfileStore`
interface is the only thing the routers touch.
"""

from __future__ import annotations

import json
import threading
from pathlib import Path

from app.models.profile import HearingProfile, PerceptionProfile, VisionProfile

_FILE_NAME = "profile.json"


class ProfileStore:
    """Thread-safe JSON-file-backed store for the perception profile."""

    def __init__(self, directory: Path) -> None:
        self._path = Path(directory) / _FILE_NAME
        self._lock = threading.RLock()

    @property
    def path(self) -> Path:
        return self._path

    def get(self) -> PerceptionProfile | None:
        with self._lock:
            if not self._path.exists():
                return None
            raw = json.loads(self._path.read_text(encoding="utf-8"))
            return PerceptionProfile.model_validate(raw)

    def save(self, profile: PerceptionProfile) -> PerceptionProfile:
        with self._lock:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self._path.with_suffix(".json.tmp")
            tmp.write_text(
                profile.model_dump_json(indent=2), encoding="utf-8"
            )
            tmp.replace(self._path)
        return profile

    def update_hearing(self, hearing: HearingProfile) -> PerceptionProfile:
        profile = self.get() or PerceptionProfile()
        profile.hearing = hearing
        profile.generated_at = hearing.completed_at
        return self.save(profile)

    def update_vision(self, vision: VisionProfile) -> PerceptionProfile:
        profile = self.get() or PerceptionProfile()
        profile.vision = vision
        profile.generated_at = vision.completed_at
        return self.save(profile)
