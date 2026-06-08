from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import math

from app.core.database import get_db
from app.core.security import ClerkUser, get_current_user
from app.models.site_audit import SiteAudit
from app.models.analysis_report import AnalysisReport
from app.models.user import User

router = APIRouter(prefix="/history", tags=["History"])

@router.get("/public-report/{report_id}")
async def get_public_report(report_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch a public report by its UUID."""
    import uuid
    try:
        parsed_id = uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid report ID format")
        
    result = await db.execute(select(AnalysisReport).where(AnalysisReport.id == parsed_id))
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    return {
        "report_id": str(report.id),
        "url": report.source_url,
        "page_title": report.seo_report.get("page_title") or report.source_url,
        "category": report.seo_report.get("category", "generic"),
        "category_label": report.seo_report.get("category", ""),
        "seo_report": report.seo_report,
        "aeo_report": report.aeo_report,
        "created_at": report.created_at,
    }

@router.get("/public-audit/{audit_id}")
async def get_public_audit(audit_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch a public Mode A audit by its UUID."""
    import uuid
    try:
        parsed_id = uuid.UUID(audit_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid audit ID format")
        
    result = await db.execute(select(SiteAudit).where(SiteAudit.id == parsed_id))
    sa = result.scalar_one_or_none()
    
    if not sa:
        raise HTTPException(status_code=404, detail="Audit not found")
        
    products = []
    if sa.sitewide_issues and "products" in sa.sitewide_issues:
        products = sa.sitewide_issues["products"]

    categories = sa.crawl_map.get("categories", []) if sa.crawl_map else []

    return {
        "audit_id": str(sa.id),
        "domain": sa.input_url,
        "homepage_url": sa.input_url,
        "categories_found": sa.total_categories or len(categories),
        "total_products": sa.total_products or 0,
        "products_analyzed": sa.products_audited or len(products),
        "avg_seo_score": sa.site_score or 0,
        "avg_aeo_score": sa.score_breakdown.get("avg_aeo", 0) if sa.score_breakdown else 0,
        "top_issues": sa.sitewide_issues.get("top_issues", []) if sa.sitewide_issues else [],
        "categories": categories,
        "products": products,
        "created_at": sa.created_at,
    }

@router.get("")
async def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    clerk_user: ClerkUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_result = await db.execute(select(User).where(User.clerk_user_id == clerk_user.clerk_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found in DB")

    tenant_id = user.tenant_id
    offset = (page - 1) * limit

    # Mode A: SiteAudits
    site_audits_result = await db.execute(
        select(SiteAudit)
        .where(SiteAudit.tenant_id == tenant_id)
        .order_by(desc(SiteAudit.created_at))
    )
    site_audits = site_audits_result.scalars().all()

    # Mode B: Standalone AnalysisReports (no site_audit_id)
    reports_result = await db.execute(
        select(AnalysisReport)
        .where(
            AnalysisReport.tenant_id == tenant_id,
            AnalysisReport.site_audit_id == None,
        )
        .order_by(desc(AnalysisReport.created_at))
    )
    reports = reports_result.scalars().all()

    # ── Build combined list ────────────────────────────────────────────────
    combined = []

    for sa in site_audits:
        products = []
        if sa.sitewide_issues and "products" in sa.sitewide_issues:
            products = sa.sitewide_issues["products"]

        categories = sa.crawl_map.get("categories", []) if sa.crawl_map else []

        result_data = {
            "domain": sa.input_url,
            "homepage_url": sa.input_url,
            "categories_found": sa.total_categories or len(categories),
            "total_products": sa.total_products or 0,
            "products_analyzed": sa.products_audited or len(products),
            "avg_seo_score": sa.site_score or 0,
            "avg_aeo_score": sa.score_breakdown.get("avg_aeo", 0) if sa.score_breakdown else 0,
            "top_issues": sa.sitewide_issues.get("top_issues", []) if sa.sitewide_issues else [],
            "categories": categories,
            "products": products,
            # Extra for history score display
            "site_score": sa.site_score or 0,
        }
        combined.append({
            "id": str(sa.id),
            "url": sa.input_url,
            "mode": "Mode A - Site Overview",
            "status": sa.status,
            "created_at": sa.created_at,
            "result_data": result_data,
        })

    for r in reports:
        seo_score = r.seo_score or r.seo_report.get("overall_seo_score", 0) or 0
        aeo_score = r.aeo_report.get("ai_visibility_score", 0) or 0
        health = r.overall_health_score or round((seo_score + aeo_score) / 2, 1)

        # Use SAME key names as the live stream's `complete` event
        # so ModeBReport can read result.seo_report / result.aeo_report directly.
        result_data = {
            "page_title": r.seo_report.get("page_title") or r.source_url,
            "url": r.source_url,
            "category": r.seo_report.get("category", "generic"),
            "category_label": r.seo_report.get("category", ""),
            "seo_report": r.seo_report,       # ← correct key for ModeBReport
            "aeo_report": r.aeo_report,       # ← correct key for ModeBReport
            "overall_health_score": health,
        }
        combined.append({
            "id": str(r.id),
            "url": r.source_url,
            "mode": "Mode B - Product Report",
            "status": r.status,
            "created_at": r.created_at,
            "result_data": result_data,
        })

    # Sort & paginate
    combined.sort(key=lambda x: x["created_at"], reverse=True)
    total = len(combined)
    paginated = combined[offset : offset + limit]

    for item in paginated:
        if item["created_at"]:
            item["created_at"] = item["created_at"].isoformat()

    return {
        "data": paginated,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if total else 1,
    }
