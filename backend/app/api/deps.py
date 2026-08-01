"""Shared FastAPI dependencies (app-state access)."""

from __future__ import annotations

from fastapi import Request

from app.processors.registry import ProcessorRegistry
from app.storage.profile_store import ProfileStore


def get_store(request: Request) -> ProfileStore:
    return request.app.state.profile_store


def get_registry(request: Request) -> ProcessorRegistry:
    return request.app.state.registry
