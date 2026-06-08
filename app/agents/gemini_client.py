from __future__ import annotations
import json
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()


async def gemini_generate(system: str, user: str, max_tokens: int = 8192) -> str:
    """Call Gemini Flash. Returns raw text or raises RuntimeError."""
    if not _settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY not configured")
    try:
        import google.generativeai as genai
        genai.configure(api_key=_settings.gemini_api_key)
        model = genai.GenerativeModel(
            model_name=_settings.model_gemini,
            system_instruction=system,
        )
        resp = await model.generate_content_async(
            user,
            generation_config={"max_output_tokens": max_tokens, "temperature": 0.2},
        )
        return resp.text or ""
    except Exception as e:
        raise RuntimeError(f"Gemini error: {e}") from e


async def llm_call(system: str, user: str, max_tokens: int = 8192) -> str:
    """Try Gemini Flash first to save cost, fall back to Claude Haiku."""
    if _settings.gemini_api_key:
        try:
            return await gemini_generate(system, user, max_tokens)
        except Exception as e:
            logger.warning(f"llm_call.gemini_failed error={e}")

    if _settings.anthropic_api_key:
        try:
            from app.agents.claude_client import claude
            resp = await claude.messages.create(
                model=_settings.model_haiku,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            return resp.content[0].text or ""
        except Exception as e:
            logger.warning(f"llm_call.claude_failed error={e}")

    raise RuntimeError("No LLM available. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.")
