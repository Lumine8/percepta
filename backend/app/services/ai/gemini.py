"""Thin Gemini API client wrapper.

Keeps the ``google-genai`` SDK behind a tiny interface so processors (and tests)
never talk to it directly. Methods return ``None`` on any failure — the AI
processors use that as the signal to fall back to rule-based DSP.
"""

from __future__ import annotations

import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import google.genai as genai
    from google.genai import types
except ImportError:  # pragma: no cover - optional dependency
    genai = None
    types = None


def _extract_json(text: str | None) -> dict | None:
    if not text:
        return None
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:].lstrip()

    # Models occasionally emit trailing tokens after the JSON object (e.g. an
    # extra closing brace). Extract the outermost balanced {...} before parsing.
    start = text.find("{")
    if start == -1:
        logger.warning("Gemini returned non-JSON content: %.120s", text)
        return None
    depth = 0
    in_str = False
    escaped = False
    end = -1
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    if end == -1:
        logger.warning("Gemini returned unbalanced JSON: %.120s", text)
        return None

    try:
        parsed = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        logger.warning("Gemini returned non-JSON content: %.120s", text)
        return None
    return parsed if isinstance(parsed, dict) else None


class GeminiClient:
    """Wrapper around a Gemini text + multimodal model."""

    def __init__(
        self, api_key: str, model: str = "gemini-3.5-flash", timeout_s: float = 30.0
    ) -> None:
        if genai is None:
            raise RuntimeError("google-genai is not installed")
        self.model = model
        self._client = genai.Client(
            api_key=api_key, http_options={"timeout": int(timeout_s * 1000)}
        )

    def generate_json(self, prompt: str) -> dict | None:
        """Ask the model for a JSON object; return ``None`` on any failure."""
        try:
            response = self._client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            return _extract_json(response.text)
        except Exception:
            logger.exception("Gemini text call failed")
            return None

    def analyze_image_json(self, image_bytes: bytes, mime_type: str, prompt: str) -> dict | None:
        """Send an image inline and ask for a JSON object; ``None`` on failure."""
        try:
            response = self._client.models.generate_content(
                model=self.model,
                contents=[
                    prompt,
                    types.Part(
                        inline_data=types.Blob(mime_type=mime_type, data=image_bytes)
                    ),
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0,
                ),
            )
            return _extract_json(response.text)
        except Exception:
            logger.exception("Gemini image call failed")
            return None


def get_gemini_client() -> GeminiClient | None:
    """Return a configured client, or ``None`` when the API key is missing."""
    if not settings.gemini_api_key:
        return None
    return GeminiClient(
        api_key=settings.gemini_api_key,
        model=settings.gemini_model,
        timeout_s=settings.gemini_timeout_s,
    )
