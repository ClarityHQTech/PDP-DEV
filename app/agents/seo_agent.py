from __future__ import annotations
import json, time
from typing import Any
from app.agents.gemini_client import llm_call
from app.agents.json_utils import safe_json_parse
from app.agents.category_prompts import get_seo_system_prompt
from app.core.logging import get_logger

logger = get_logger(__name__)

def _build_user_msg(dom: dict, markdown: str) -> str:
    schemas = dom.get("schemas", [])
    schema_summary = [f"- {s.get('@type','?')}: {json.dumps(s)[:300]}" for s in schemas]
    og = dom.get("open_graph", {})
    img = dom.get("image_stats", {})
    return f"""URL: {dom.get('url','')}
Title Tag: {dom.get('title_tag') or 'MISSING'} ({len(dom.get('title_tag') or '')} chars)
Meta Description: {dom.get('meta_description') or 'MISSING'} ({len(dom.get('meta_description') or '')} chars)
H1 (count={dom.get('h1_count',0)}): {dom.get('h1_values',[])}
H2s: {(dom.get('headings') or {}).get('h2',[])[:5]}
Canonical: {dom.get('canonical') or 'MISSING'}
OG: title={og.get('title') or 'missing'}, desc={og.get('description') or 'missing'}, image={'✓' if og.get('image') else 'missing'}
SSL: {dom.get('ssl_https')}, Mobile viewport: {dom.get('mobile_viewport')}
Word count: {dom.get('word_count',0)}
Images: total={img.get('total',0)}, missing_alt={img.get('missing_alt',0)}, lazy={img.get('lazy_loading',0)}
Internal links: {dom.get('internal_link_count',0)}, External: {dom.get('external_link_count',0)}
Breadcrumb nav: {dom.get('has_breadcrumb_nav',False)}
Schema.org:
{chr(10).join(schema_summary) if schema_summary else 'None detected'}

PAGE CONTENT (first 4500 chars):
{markdown[:4500]}"""

async def run_seo_agent(dom: dict[str, Any], markdown: str, category: str = "generic", brand_profile: str = "") -> dict[str, Any]:
    t0 = time.monotonic()
    logger.info(f"seo_agent.start url={dom.get('url','')} category={category}")
    system = get_seo_system_prompt(category)
    if brand_profile:
        system += f"\n\nCRITICAL BRAND COMPLIANCE INSTRUCTIONS:\nYou MUST rigorously enforce the following Brand Configuration Profile (BCP) and Ideal Customer Profile (ICP). Deduct points and raise critical issues if the content violates these rules (e.g., using forbidden words, wrong tone, missing the target persona).\n{brand_profile}"
    user = _build_user_msg(dom, markdown)
    try:
        raw = await llm_call(system, user, max_tokens=8192)
    except Exception as e:
        return {"error": str(e), "overall_seo_score": 0, "category": category}
    report, err = safe_json_parse(raw, "seo_agent")
    if err:
        return {"error": err, "overall_seo_score": 0, "category": category, "_raw": raw[:300]}

    # Override with DOM-extracted values (more reliable)
    if dom.get("title_tag") and report.get("title_tag"):
        report["title_tag"]["value"] = dom["title_tag"]
        report["title_tag"]["char_count"] = len(dom["title_tag"])
    if dom.get("meta_description") and report.get("meta_description"):
        report["meta_description"]["value"] = dom["meta_description"]
        report["meta_description"]["char_count"] = len(dom["meta_description"])
    if report.get("h1"):
        report["h1"]["value"] = dom.get("h1_values",[""])[0] or None
        report["h1"]["count"] = dom.get("h1_count", 0)
    flat_types = []
    for s in dom.get("schemas", []):
        t = s.get("@type","")
        flat_types.extend(t if isinstance(t, list) else [t])
    if report.get("structured_data"):
        report["structured_data"]["schemas_found"] = flat_types
        if "product_schema" in report["structured_data"]:
            report["structured_data"]["product_schema"]["present"] = any("Product" in x for x in flat_types)
    img = dom.get("image_stats", {})
    if img and report.get("image_seo"):
        report["image_seo"]["total_images"] = img.get("total", 0)
        report["image_seo"]["images_missing_alt"] = img.get("missing_alt", 0)
        report["image_seo"]["lazy_loading_detected"] = img.get("lazy_loading", 0) > 0
    if report.get("links"):
        report["links"]["internal_count"] = dom.get("internal_link_count", 0)
        report["links"]["external_count"] = dom.get("external_link_count", 0)
        report["links"]["has_breadcrumb_nav"] = dom.get("has_breadcrumb_nav", False)
    if report.get("technical_seo"):
        report["technical_seo"]["ssl_https"] = dom.get("ssl_https", False)
        report["technical_seo"]["mobile_viewport"] = dom.get("mobile_viewport", False)
        if dom.get("canonical"):
            report["technical_seo"].setdefault("canonical", {})["present"] = True

    # Calculate transparent SEO score
    def get_seo_score(key: str) -> float:
        val = report.get(key, {})
        if isinstance(val, dict):
            return float(val.get("score") or 0)
        return 0.0

    try:
        calculated_seo = (
            get_seo_score("title_tag") * 0.10 +
            get_seo_score("meta_description") * 0.10 +
            get_seo_score("h1") * 0.10 +
            get_seo_score("heading_hierarchy") * 0.10 +
            get_seo_score("keyword_analysis") * 0.10 +
            get_seo_score("content_quality") * 0.15 +
            get_seo_score("image_seo") * 0.10 +
            get_seo_score("structured_data") * 0.10 +
            get_seo_score("technical_seo") * 0.10 +
            get_seo_score("links") * 0.05
        ) * 10
        report["overall_seo_score"] = round(calculated_seo)
    except Exception as e:
        logger.error(f"Error calculating transparent SEO score: {e}")

    report["category"] = category
    report["_duration_ms"] = int((time.monotonic() - t0) * 1000)
    logger.info(f"seo_agent.done score={report.get('overall_seo_score')} ms={report['_duration_ms']}")
    return report
