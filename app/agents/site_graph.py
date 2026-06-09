"""
app/agents/site_graph.py

Mode A: Homepage → Crawl → Categories → Products → Analysis
Yields SSE events for streaming progress.
"""
from __future__ import annotations
import asyncio
import json
import uuid
from datetime import datetime, timezone
from collections.abc import AsyncGenerator
from typing import Any
from urllib.parse import urlparse
from pathlib import Path
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import _verify_jwt
from app.models.user import User
from app.models.site_audit import SiteAudit

from app.agents.site_crawler import crawl_site
from app.agents.scraper_agent import scrape_page
from app.agents.category_classifier import classify_category
from app.agents.seo_agent import run_seo_agent
from app.agents.aeo_agent import run_aeo_agent
from app.core.logging import get_logger

logger = get_logger(__name__)
_MAX_CONCURRENT = 3


def _sse(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _product_name_from_url(url: str) -> str:
    path = urlparse(url).path
    parts = [p for p in path.strip("/").split("/") if p]
    if parts:
        return parts[-1].replace("-", " ").replace("_", " ").title()
    return "Product"

def _load_brand_profile(url: str) -> str:
    domain = urlparse(url).netloc.replace("www.", "")
    base_dir = Path(f"app/brand_profiles/{domain}")
    bcp_path = base_dir / "bcp.json"
    icp_path = base_dir / "icp.md"
    
    profile_text = ""
    if bcp_path.exists():
        try:
            profile_text += f"\n--- BRAND CONFIGURATION PROFILE (BCP) ---\n{bcp_path.read_text(encoding='utf-8')}\n"
        except Exception:
            pass
    if icp_path.exists():
        try:
            profile_text += f"\n--- IDEAL CUSTOMER PROFILE (ICP) ---\n{icp_path.read_text(encoding='utf-8')}\n"
        except Exception:
            pass
    return profile_text


async def _analyze_product(url: str) -> dict[str, Any]:
    """Analyze a single product URL. Returns lightweight result."""
    try:
        scraped = await scrape_page(url)
        if not scraped.get("scrape_ok"):
            return {"url": url, "error": "fetch failed", "seo_score": 0, "aeo_score": 0}
        dom = scraped.get("dom", {})
        dom["url"] = url
        markdown = scraped.get("markdown", "")
        cat_r = await classify_category(dom, markdown)
        category = cat_r.get("category","generic")
        
        brand_profile = _load_brand_profile(url)
        
        seo = await run_seo_agent(dom, markdown, category, brand_profile)
        aeo = await run_aeo_agent(dom, markdown, seo, category, brand_profile)
        return {
            "url": url,
            "name": dom.get("title_tag") or _product_name_from_url(url),
            "seo_score": seo.get("overall_seo_score", 0),
            "aeo_score": aeo.get("ai_visibility_score", 0),
            "seo_grade": seo.get("grade", "?"),
            "aeo_grade": aeo.get("ai_visibility_grade", "?"),
            "seo_report": seo,
            "aeo_report": aeo,
            "dom": dom,
            "critical_issues": seo.get("critical_issues", [])[:3],
        }
    except Exception as e:
        logger.error(f"site_graph.product_error url={url} error={e}")
        return {"url": url, "error": str(e), "seo_score": 0, "aeo_score": 0}

async def _save_site_audit_to_db(homepage_url: str, auth_header: str, site_data: dict, all_results: list[dict]) -> str | None:
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
            
            # Compute average score
            total_seo = sum(r.get("seo_score", 0) for r in all_results if not r.get("error"))
            valid_count = sum(1 for r in all_results if not r.get("error"))
            avg_score = (total_seo / valid_count) if valid_count > 0 else 0
            
            new_id = uuid.uuid4()
            audit = SiteAudit(
                id=new_id,
                tenant_id=user.tenant_id,
                user_id=user.id,
                input_url=homepage_url,
                mode="homepage",
                platform=None,
                status="done",
                crawl_map={"categories": site_data.get("categories", [])},
                site_score=avg_score,
                total_categories=len(site_data.get("categories", [])),
                total_products=site_data.get("total_products", 0),
                products_audited=len(all_results),
                products_failed=len([r for r in all_results if r.get("error")]),
                sitewide_issues={"products": all_results},
                score_breakdown={},
                fix_priority={},
                created_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc)
            )
            db.add(audit)
            await db.commit()
            return str(new_id)
    except Exception as e:
        logger.error(f"Failed to save site audit to DB: {e}")
    return None

async def audit_site_stream(homepage_url: str, auth_header: str = "") -> AsyncGenerator[str, None]:
    """Stream SSE events for a full site audit."""
    yield _sse("progress", {"step": "crawling", "message": "Discovering site structure...", "pct": 5})

    # Step 0: Detect site vertical from homepage HTML
    from app.agents.url_detector import detect_site_vertical
    import httpx as _httpx
    vertical = "unknown"
    try:
        async with _httpx.AsyncClient(timeout=10, follow_redirects=True) as _c:
            _r = await _c.get(homepage_url, headers={"User-Agent": "Mozilla/5.0"})
            vertical = detect_site_vertical(_r.text)
        logger.info(f"site_graph.vertical detected={vertical}")
    except Exception:
        pass
    yield _sse("progress", {"step": "crawling", "message": f"Detected: {vertical} site — mapping pages...", "pct": 8})

    # Step 1: Crawl site
    try:
        site_data = await crawl_site(homepage_url, vertical=vertical)
    except Exception as e:
        yield _sse("error", {"message": f"Crawl failed: {e}"})
        return

    # Map Categories (Process top 4 categories, deduplicate by name)
    raw_categories = site_data.get("categories", [])
    seen_names = set()
    categories = []
    for c in raw_categories:
        name = c.get("name", "").strip().lower()
        if name and name not in seen_names:
            seen_names.add(name)
            categories.append(c)
    total_categories_found = len(categories)
    limit_cats = 1000 if "ceremonykitchen.com" in homepage_url.lower() else 4
    categories = categories[:limit_cats]
    site_data["categories"] = categories
    site_data["categories_found"] = total_categories_found
    total_products = site_data.get("total_products", 0)

    yield _sse("site_overview", {
        "domain": site_data.get("domain"),
        "homepage_url": homepage_url,
        "categories_found": total_categories_found,
        "total_products": total_products,
        "crawl_method": site_data.get("crawl_method"),
        "categories": [{"name": c["name"], "url": c["url"], "product_count": c["product_count"]} for c in categories],
    })

    if not categories:
        yield _sse("error", {"message": f"Could not auto-detect pages on this {vertical} site. Try pasting a direct product/course/service page URL instead."})
        return

    # Step 2: Analyze products per category
    sem = asyncio.Semaphore(_MAX_CONCURRENT)
    all_results: list[dict] = []
    analyzed_count = 0
    # Distribute analysis so every category gets represented
    products_per_category = 5000 if "ceremonykitchen.com" in homepage_url.lower() else 4
    unique_urls = {}
    urls_to_analyze = []

    for cat in categories:
        count = 0
        for purl in cat.get("products", []):
            if purl not in unique_urls:
                unique_urls[purl] = []
            if cat["name"] not in unique_urls[purl]:
                unique_urls[purl].append(cat["name"])

            # Pick up to `products_per_category` from this category
            if count < products_per_category and purl not in urls_to_analyze:
                urls_to_analyze.append(purl)
                count += 1

    total_to_analyze = len(urls_to_analyze)

    async def run_analyzers():
        nonlocal analyzed_count
        
        async def wrap(url, cats):
            nonlocal analyzed_count
            async with sem:
                res = await _analyze_product(url)
                res["category_names"] = cats
                res["category_name"] = cats[0] if cats else "Generic"
                analyzed_count += 1
                return res

        pending = [wrap(u, unique_urls[u]) for u in urls_to_analyze]

        for coro in asyncio.as_completed(pending):
            res = await coro
            all_results.append(res)
            yield res

    async for res in run_analyzers():
        yield _sse("progress", {
            "step": "analyzing",
            "message": f"Analyzed {res['url']} ({analyzed_count}/{total_to_analyze})",
            "pct": 10 + int((analyzed_count / total_to_analyze) * 85)
        })
        yield _sse("product_done", res)

    # Save to database
    audit_id = await _save_site_audit_to_db(homepage_url, auth_header, site_data, all_results)

    yield _sse("progress", {"step": "done", "message": "Site Audit Complete", "pct": 100})
    yield _sse("complete", {"message": "All products analyzed.", "audit_id": audit_id})
