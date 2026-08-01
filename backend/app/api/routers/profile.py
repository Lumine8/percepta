"""Profile endpoint.

- ``GET /profile``  return the full single-user perception profile.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_store
from app.models.profile import PerceptionProfile
from app.storage.profile_store import ProfileStore

router = APIRouter(tags=["profile"])


@router.get("/profile", response_model=PerceptionProfile, summary="Get the perception profile")
def get_profile(store: ProfileStore = Depends(get_store)) -> PerceptionProfile:
    profile = store.get()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found — complete an assessment first")
    return profile
