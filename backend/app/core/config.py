"""Application settings loaded from environment / .env.

All settings are prefixed with ``PERCEPTA_``:

- ``PERCEPTA_DATA_DIR``              directory for persisted runtime data (profile JSON)
- ``PERCEPTA_CORS_ORIGINS``          comma-separated allowed browser origins
- ``PERCEPTA_HOST`` / ``PERCEPTA_PORT`` uvicorn bind address
- ``PERCEPTA_USE_AI_PROCESSORS``     swap rule-based stages for Gemini-backed ones
- ``PERCEPTA_GEMINI_API_KEY``        Gemini API key (kept out of git)
- ``PERCEPTA_GEMINI_MODEL``          Gemini model id (default: gemini-3.5-flash)
- ``PERCEPTA_GEMINI_TIMEOUT_S``      per-request timeout for Gemini calls
"""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application configuration."""

    model_config = SettingsConfigDict(
        env_prefix="PERCEPTA_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    #: Root of the backend package (backend/)
    backend_dir: Path = Path(__file__).resolve().parents[2]

    #: Where runtime data (the single-user profile) is persisted.
    data_dir: Path = Path(__file__).resolve().parents[2] / "data"

    #: Comma-separated list of allowed CORS origins.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    host: str = "0.0.0.0"
    port: int = 8000

    #: When enabled, AI-backed processors registered in the registry are used in
    #: place of the rule-based stages. No other code changes required. Stages
    #: degrade to their rule-based behavior if Gemini is unreachable.
    use_ai_processors: bool = False

    #: Gemini API key. Optional — AI stages silently fall back to rule-based DSP.
    gemini_api_key: str | None = None
    #: Gemini model used by the AI processors (JSON mode + image input).
    gemini_model: str = "gemini-3.5-flash"
    #: Per-request timeout for Gemini calls (seconds).
    gemini_timeout_s: float = 30.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
