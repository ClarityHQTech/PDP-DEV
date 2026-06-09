"""
Report export endpoint — returns structured JSON for PDF generation on frontend.
GET /api/report/{report_id}/export  → Mode B (single product)
GET /api/site-report/{audit_id}/export → Mode A (site audit)
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from app.core.database import get_db
from app.models.analysis_report import AnalysisReport
from app.models.site_audit import SiteAudit
from app.core.security import get_current_user, ClerkUser

router = APIRouter()

@router.get("/api/report/{report_id}/export")
async def export_product_report(
    report_id: str,
    db=Depends(get_db),
    current_user: ClerkUser = Depends(get_current_user),
):
    """Export single product audit as structured JSON for PDF."""
    result = await db.execute(select(AnalysisReport).where(AnalysisReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")

    return {
        "type": "product_audit",
        "meta": {
            "product_title": report.product_title,
            "url": report.url,
            "domain": report.domain,
            "category": report.category,
            "platform": report.platform,
            "analyzed_at": report.created_at.isoformat() if report.created_at else None,
        },
        "scores": {
            "seo": report.seo_score,
            "aeo": report.aeo_score,
            "brand": report.brand_score,
        },
        "seo": report.seo_report,
        "aeo": report.aeo_report,
        "brand": report.brand_report,
        "recommendations": report.recommendations,
    }


@router.get("/api/site-report/{audit_id}/export")
async def export_site_report(
    audit_id: str,
    db=Depends(get_db),
    current_user: ClerkUser = Depends(get_current_user),
):
    """Export full site audit as structured JSON for PDF."""
    result = await db.execute(select(SiteAudit).where(SiteAudit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(404, "Site audit not found")

    return {
        "type": "site_audit",
        "meta": {
            "domain": audit.domain,
            "homepage_url": audit.homepage_url,
            "analyzed_at": audit.created_at.isoformat() if audit.created_at else None,
            "total_categories": len(audit.categories or []),
            "total_products": sum(len(c.get("products", [])) for c in (audit.categories or [])),
        },
        "categories": audit.categories,  # full nested with product reports
        "summary": audit.summary,
    }
