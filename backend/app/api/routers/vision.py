"""Vision endpoints.

- ``POST /vision/analyze``  score + persist the assessment battery.
- ``POST /vision/enhance``  enhance an uploaded image to the vision profile.
"""

from __future__ import annotations

import json
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.deps import get_registry, get_store
from app.models.audio import ImageDocument
from app.models.profile import PerceptionProfile, VisionProfile
from app.processors.registry import ProcessorRegistry
from app.schemas.vision import (
    VisionAnalyzeRequest,
    VisionEnhanceOptions,
    VisionEnhanceResponse,
)
from app.services.analysis.vision_scoring import score_vision
from app.services.vision.pipeline import VisionPipeline
from app.storage.profile_store import ProfileStore
from app.utils import image_io

router = APIRouter(prefix="/vision", tags=["vision"])


def _parse_profile(json_str: str | None) -> PerceptionProfile:
    if not json_str:
        return PerceptionProfile()
    try:
        vision = VisionProfile.model_validate_json(json_str)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid profile JSON: {exc}")
    return PerceptionProfile(vision=vision)


def _parse_options(json_str: str | None) -> dict:
    if not json_str:
        return {}
    try:
        opts = json.loads(json_str)
        return VisionEnhanceOptions.model_validate(opts).model_dump()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid options JSON: {exc}")


@router.post("/analyze", response_model=VisionProfile, summary="Score + store a vision assessment")
def submit_vision_analysis(
    payload: VisionAnalyzeRequest,
    store: ProfileStore = Depends(get_store),
) -> VisionProfile:
    """Interpret and persist the four in-browser vision assessments."""
    completed_at = (
        datetime.fromisoformat(payload.completed_at.replace("Z", "+00:00"))
        if payload.completed_at
        else None
    )

    contrast = payload.contrast.model_dump() if payload.contrast else None
    color = payload.color.model_dump() if payload.color else None
    acuity_row = payload.acuity.last_readable_row if payload.acuity else None
    blind_spot = payload.blind_spot.model_dump() if payload.blind_spot else None

    vision = score_vision(
        contrast=contrast,
        color_plates=color["plates"] if color else [],
        acuity_snellen=acuity_row,
        blind_spot=blind_spot,
        completed_at=completed_at,
    )
    store.update_vision(vision)
    return vision


@router.post(
    "/enhance",
    response_model=VisionEnhanceResponse,
    summary="Enhance an image to the vision profile",
)
async def enhance_image(
    file: UploadFile = File(...),
    profile: str | None = Form(default=None),
    options: str | None = Form(default=None),
    registry: ProcessorRegistry = Depends(get_registry),
    store: ProfileStore = Depends(get_store),
) -> VisionEnhanceResponse:
    """Run the image-enhancement pipeline over an uploaded image."""
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image upload")

    try:
        image = image_io.decode_image(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    user_profile = _parse_profile(profile)
    if user_profile.vision is None and store.get() is not None:
        stored = store.get()
        user_profile.vision = stored.vision if stored else None

    doc = ImageDocument(
        image=image,
        metadata={"options": _parse_options(options)},
    )
    pipeline = VisionPipeline(registry)
    enhanced = pipeline.process(doc, user_profile)

    png = image_io.encode_png(enhanced.image)
    meta = dict(enhanced.metadata)
    stages = meta.pop("applied_stages", [])

    return VisionEnhanceResponse(
        enhanced_b64=image_io.b64_encode(png),
        width=enhanced.width,
        height=enhanced.height,
        stages=stages,
        meta=meta,
    )
