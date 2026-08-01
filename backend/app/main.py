"""FastAPI application factory for the Percepta backend."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.routers import hearing, profile, vision
from app.core.config import settings
from app.processors.factory import build_registry
from app.storage.profile_store import ProfileStore


def create_app() -> FastAPI:
    app = FastAPI(
        title="Percepta API",
        description=(
            "Personalized accessibility adaptation: hearing and vision "
            "assessments + rule-based signal/image processing. "
            "Interactive docs: /docs."
        ),
        version=__version__,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # App state: shared, dependency-injected singletons.
    app.state.profile_store = ProfileStore(settings.data_dir)
    app.state.registry = build_registry()

    app.include_router(hearing.router)
    app.include_router(vision.router)
    app.include_router(profile.router)

    @app.get("/health", tags=["system"], summary="Liveness probe")
    def health() -> dict[str, str]:
        return {"status": "ok", "version": __version__}

    return app


app = create_app()
