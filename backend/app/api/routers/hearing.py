"""Hearing endpoints.

- ``POST /hearing/test``    store + interpret a completed tone assessment.
- ``POST /hearing/process`` adapt an uploaded/recorded audio file to the profile.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.deps import get_registry, get_store
from app.models.audio import AudioDocument
from app.models.profile import HearingProfile, PerceptionProfile
from app.processors.registry import ProcessorRegistry
from app.schemas.hearing import HearingProcessResponse, HearingTestRequest
from app.schemas.common import WaveformPeaks
from app.services.analysis.hearing_scoring import score_hearing
from app.services.hearing.pipeline import HearingPipeline
from app.storage.profile_store import ProfileStore
from app.utils import audio_io

router = APIRouter(prefix="/hearing", tags=["hearing"])


def _parse_profile(json_str: str | None) -> PerceptionProfile:
    """Build a full profile from an optional serialized HearingProfile JSON."""
    if not json_str:
        return PerceptionProfile()
    try:
        hearing = HearingProfile.model_validate_json(json_str)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid profile JSON: {exc}")
    return PerceptionProfile(hearing=hearing)


@router.post("/test", response_model=HearingProfile, summary="Store + score a hearing assessment")
def submit_hearing_test(
    payload: HearingTestRequest,
    store: ProfileStore = Depends(get_store),
) -> HearingProfile:
    """Interpret and persist an audiogram from the in-browser tone test."""
    completed_at = (
        datetime.fromisoformat(payload.completed_at.replace("Z", "+00:00"))
        if payload.completed_at
        else None
    )
    hearing = score_hearing(payload.ear, payload.audiogram, completed_at)
    store.update_hearing(hearing)
    return hearing


@router.post(
    "/process",
    response_model=HearingProcessResponse,
    summary="Adapt an audio file to the hearing profile",
)
async def process_audio(
    file: UploadFile = File(...),
    profile: str | None = Form(default=None),
    registry: ProcessorRegistry = Depends(get_registry),
    store: ProfileStore = Depends(get_store),
) -> HearingProcessResponse:
    """Run the speech-adaptation pipeline over an uploaded audio file."""
    if file.content_type and not (
        file.content_type.startswith("audio/")
        or file.content_type.startswith("video/")
        or file.content_type in {"application/octet-stream"}
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported content type: {file.content_type}",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio upload")

    try:
        samples, sample_rate = audio_io.decode_audio(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    user_profile = _parse_profile(profile)
    if user_profile.hearing is None and store.get() is not None:
        stored = store.get()
        user_profile.hearing = stored.hearing if stored else None

    audio = AudioDocument(samples=samples, sample_rate=sample_rate)
    pipeline = HearingPipeline(registry)
    processed = pipeline.process(audio, user_profile)

    processed_wav = audio_io.encode_wav(processed.samples, sample_rate)
    meta = dict(processed.metadata)

    return HearingProcessResponse(
        duration_s=round(processed.duration_s, 3),
        sample_rate=processed.sample_rate,
        original=WaveformPeaks(peaks=audio_io.compute_peaks(samples)),
        processed=WaveformPeaks(peaks=audio_io.compute_peaks(processed.samples)),
        processed_audio_b64=audio_io.b64_encode(processed_wav),
        stages=meta.pop("applied_stages", []),
        meta=meta,
    )
