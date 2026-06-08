from __future__ import annotations
import json
import re


def safe_json_parse(raw: str, agent: str = "") -> tuple[dict, str | None]:
    """Parse JSON from LLM output. Strips markdown fences, finds first {...} block."""
    if not raw:
        return {}, f"{agent}: empty response"

    text = raw.strip()

    # Strip markdown fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    # Find first complete JSON object
    start = text.find("{")
    if start == -1:
        return {}, f"{agent}: no JSON object found in response"

    # Balance braces
    depth = 0
    end = -1
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break

    if end == -1:
        end = len(text)

    candidate = text[start:end]
    try:
        return json.loads(candidate), None
    except json.JSONDecodeError as e:
        # Last resort: try to fix common issues
        fixed = re.sub(r",\s*([}\]])", r"\1", candidate)  # trailing commas
        try:
            return json.loads(fixed), None
        except json.JSONDecodeError:
            return {}, f"{agent}: JSON parse error: {e}"
