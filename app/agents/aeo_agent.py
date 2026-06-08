from __future__ import annotations
import json, time
from typing import Any
from app.agents.gemini_client import llm_call
from app.agents.json_utils import safe_json_parse
from app.agents.category_prompts import get_aeo_system_prompt
from app.core.logging import get_logger

logger = get_logger(__name__)

def _build_user_msg(dom: dict, markdown: str) -> str:
    schemas = dom.get("schemas", [])
    schema_types = [s.get("@type","") for s in schemas]
    product_schema = next((s for s in schemas if "Product" in str(s.get("@type",""))), {})
    return f"""URL: {dom.get('url','')}
Title: {dom.get('title_tag') or 'UNKNOWN'}
H1: {(dom.get('h1_values') or ['MISSING'])[0]}
Word Count: {dom.get('word_count',0)}
Schema Types Found: {schema_types}
Product Schema: {json.dumps(product_schema)[:500] if product_schema else 'None'}
Has FAQ Schema: {'FAQPage' in str(schema_types)}
Has Review Schema: {'Review' in str(schema_types) or 'AggregateRating' in str(schema_types)}

PAGE CONTENT:
{markdown[:5500]}"""

async def run_aeo_agent(dom: dict[str, Any], markdown: str, seo_report: dict | None = None, category: str = "generic", brand_profile: str = "") -> dict[str, Any]:
    t0 = time.monotonic()
    logger.info(f"aeo_agent.start url={dom.get('url','')} category={category}")
    system = get_aeo_system_prompt(category)
    if brand_profile:
        system += f"\n\nCRITICAL BRAND COMPLIANCE INSTRUCTIONS:\nYou MUST rigorously enforce the following Brand Configuration Profile (BCP) and Ideal Customer Profile (ICP). Deduct points and raise critical issues if the content violates these rules (e.g., using forbidden words, wrong tone, missing the target persona).\n{brand_profile}"
    user = _build_user_msg(dom, markdown)
    try:
        raw = await llm_call(system, user, max_tokens=8192)
    except Exception as e:
        return {"error": str(e), "ai_visibility_score": 0, "category": category}
    report, err = safe_json_parse(raw, "aeo_agent")
    if err:
        try:
            raw = await llm_call(system, "Output ONLY valid JSON:\n" + user, max_tokens=8192)
            report, err = safe_json_parse(raw, "aeo_retry")
        except Exception:
            pass
    if not report:
        return {"ai_visibility_score": 0, "error": err, "category": category, "quick_wins": [], "recommendations": [], "gaps": []}

    # Override schema flags from DOM
    schemas = dom.get("schemas", [])
    st = str([s.get("@type","") for s in schemas])
    if report.get("schema_for_ai"):
        report["schema_for_ai"]["product_schema"] = "Product" in st
        report["schema_for_ai"]["faq_schema"] = "FAQ" in st
        report["schema_for_ai"]["review_schema"] = "Review" in st or "AggregateRating" in st
        report["schema_for_ai"]["breadcrumb_schema"] = "Breadcrumb" in st

    # Calculate transparent AEO score
    def get_aeo_score(key: str) -> float:
        val = report.get(key, {})
        if isinstance(val, dict):
            # for eeat, it uses 'overall_score', otherwise 'score'
            if key == "eeat":
                return float(val.get("overall_score") or 0)
            return float(val.get("score") or 0)
        return 0.0

    try:
        calculated_aeo = (
            get_aeo_score("eeat") * 0.25 +
            get_aeo_score("rag_readiness") * 0.20 +
            get_aeo_score("faq_quality") * 0.20 +
            get_aeo_score("conversational_readiness") * 0.15 +
            get_aeo_score("schema_for_ai") * 0.10 +
            get_aeo_score("brand_clarity") * 0.10
        ) * 10
        report["ai_visibility_score"] = round(calculated_aeo)
    except Exception as e:
        logger.error(f"Error calculating transparent AEO score: {e}")

    report["category"] = category
    report["_duration_ms"] = int((time.monotonic() - t0) * 1000)
    logger.info(f"aeo_agent.done score={report.get('ai_visibility_score')} ms={report['_duration_ms']}")
    return report
