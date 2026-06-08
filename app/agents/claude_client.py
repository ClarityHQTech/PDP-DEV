from __future__ import annotations
import anthropic
from app.core.config import get_settings

_settings = get_settings()
claude = anthropic.AsyncAnthropic(api_key=_settings.anthropic_api_key)
