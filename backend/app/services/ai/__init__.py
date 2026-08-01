"""AI processor fleet: Gemini-backed replacements for rule-based stages."""

from app.services.ai.gemini import GeminiClient, get_gemini_client

__all__ = ["GeminiClient", "get_gemini_client"]
