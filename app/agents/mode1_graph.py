from __future__ import annotations
import json
import uuid
from datetime import datetime, timezone
from collections.abc import AsyncGenerator
from typing import Any
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import _verify_jwt
from app.models.user import User
from app.models.analysis_report import AnalysisReport

from app.agents.scraper_agent import scrape_page
from app.agents.category_classifier import classify_category
from app.agents.seo_agent import run_seo_agent
from app.agents.aeo_agent import run_aeo_agent
from app.core.logging import get_logger

logger = get_logger(__name__)

CATEGORY_LABELS = {
    "fashion": "👗 Fashion / Apparel",
    "electronics": "💻 Electronics / Tech",
    "beauty": "💄 Beauty / Skincare",
    "furniture": "🏠 Furniture / Home Decor",
    "supplements": "💊 Health / Supplements",
    "food": "🍱 Food / Grocery",
    "sports": "🏃 Sports / Fitness",
    "jewellery": "💎 Jewellery",
    "pets": "🐾 Pets",
    "generic": "🛒 General Ecommerce",
}

def _sse(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

async def _save_report_to_db(url: str, auth_header: str, result: dict[str, Any]) -> str | None:
    """Extract user from token and save AnalysisReport to DB, return UUID string."""
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    
    try:
        payload = _verify_jwt(token)
        sub = payload.get("sub")
        if not sub: return
        
        async with AsyncSessionLocal() as db:
            user_result = await db.execute(select(User).where(User.clerk_user_id == sub))
            user = user_result.scalar_one_or_none()
            if not user: return
            
            new_id = uuid.uuid4()
            report = AnalysisReport(
                id=new_id,
                tenant_id=user.tenant_id,
                user_id=user.id,
                source_url=url,
                competitor_urls=[],
                raw_markdown="", # Don't save full raw markdown to save space
                scraper_method="api",
                json_structured_data={},
                seo_report=result.get("seo_report", {}),
                aeo_report=result.get("aeo_report", {}),
                ux_report={},
                competitor_report={},
                psychology_report={},
                final_diagnosis={},
                autofix_report={},
                generated_content={},
                seo_score=result.get("seo_report", {}).get("overall_seo_score", 0),
                overall_health_score=round(
                    (result.get('seo_report', {}).get('overall_seo_score', 0) +
                     result.get('aeo_report', {}).get('ai_visibility_score', 0)) / 2, 1),
                status="completed",
                agent_logs=[],
                created_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc)
            )
            db.add(report)
            await db.commit()
            return str(new_id)
    except Exception as e:
        logger.error(f"Failed to save report to DB: {e}")
    return None

async def analyze_pdp_stream(url: str, auth_header: str = "") -> AsyncGenerator[str, None]:
    yield _sse("progress", {"step": "fetching", "message": "Fetching page content...", "pct": 10})
    scraped = await scrape_page(url)
    if not scraped.get("scrape_ok") and not scraped.get("markdown"):
        yield _sse("error", {"message": f"Could not fetch page: {url}"})
        return
    markdown = scraped.get("markdown", "")
    dom = scraped.get("dom", {})
    dom["url"] = url

    yield _sse("progress", {"step": "classifying", "message": "Detecting product category...", "pct": 25})
    cat_result = await classify_category(dom, markdown)
    category = cat_result.get("category", "generic")
    yield _sse("category_detected", {
        "category": category,
        "label": CATEGORY_LABELS.get(category, category),
        "sub_category": cat_result.get("sub_category", ""),
        "confidence": cat_result.get("confidence", 0),
    })

    yield _sse("page_meta", {"title": dom.get("title_tag") or "Unknown", "url": url, "word_count": dom.get("word_count", 0)})
    yield _sse("progress", {"step": "seo", "message": f"Running {CATEGORY_LABELS.get(category,'SEO')} analysis...", "pct": 50})
    seo_report = await run_seo_agent(dom, markdown, category)

    yield _sse("progress", {"step": "aeo", "message": "Analyzing AI visibility (AEO)...", "pct": 75})
    aeo_report = await run_aeo_agent(dom, markdown, seo_report, category)

    yield _sse("progress", {"step": "done", "message": "Analysis complete!", "pct": 100})
    
    final_result = {
        "url": url,
        "page_title": dom.get("title_tag") or seo_report.get("page_title") or "Product Page",
        "category": category,
        "category_label": CATEGORY_LABELS.get(category, category),
        "seo_report": seo_report,
        "aeo_report": aeo_report,
        "dom": dom,
    }
    
    # Save to DB asynchronously
    report_id = await _save_report_to_db(url, auth_header, final_result)
    if report_id:
        final_result["report_id"] = report_id
    
    yield _sse("complete", final_result)
