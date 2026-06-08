"""
app/models/site_audit.py

SiteAudit + CategoryAudit — DB models for site-wide audit jobs.

SiteAudit → holds the job status, crawl map, and aggregated site score.
CategoryAudit → holds per-category analysis results.
Product-level results reuse the existing AnalysisReport table (with new FK columns).
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SiteAudit(Base):
    __tablename__ = "site_audits"

    # ── Primary key ───────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Foreign keys ──────────────────────────────────────────────────────────
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Input ─────────────────────────────────────────────────────────────────
    input_url: Mapped[str] = mapped_column(Text, nullable=False)
    mode: Mapped[str] = mapped_column(
        String(20), nullable=False, default="homepage"
    )  # homepage | category | product

    # ── Detection ─────────────────────────────────────────────────────────────
    platform: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )  # shopify | woocommerce | custom

    # ── Pipeline status ───────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )  # pending | crawling | analyzing | done | failed

    # ── Crawl results (saved BEFORE analysis → enables resume) ────────────────
    crawl_map: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # {"categories": [{"url": "...", "name": "...", "product_urls": [...]}]}

    # ── Aggregated results (filled by aggregator after analysis) ──────────────
    site_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_categories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_products: Mapped[int | None] = mapped_column(Integer, nullable=True)
    products_audited: Mapped[int | None] = mapped_column(Integer, nullable=True)
    products_failed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sitewide_issues: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    score_breakdown: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    fix_priority: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ── Error ─────────────────────────────────────────────────────────────────
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    categories: Mapped[list["CategoryAudit"]] = relationship(
        "CategoryAudit", back_populates="site_audit", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<SiteAudit id={self.id} status={self.status!r} url={self.input_url!r}>"


class CategoryAudit(Base):
    __tablename__ = "category_audits"

    # ── Primary key ───────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Foreign key ───────────────────────────────────────────────────────────
    site_audit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("site_audits.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Category info ─────────────────────────────────────────────────────────
    url: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    raw_category_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    resolved_category_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    source_field_used: Mapped[str | None] = mapped_column(String(100), nullable=True)
    category_detection_source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    page_type_detected: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_archive_page: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Analysis results ──────────────────────────────────────────────────────
    category_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    seo_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    issues: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    competitor_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    product_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    full_analysis_result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ── Status ────────────────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )  # pending | done | failed

    # ── Timestamp ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    site_audit: Mapped["SiteAudit"] = relationship(
        "SiteAudit", back_populates="categories"
    )

    def __repr__(self) -> str:
        return f"<CategoryAudit id={self.id} name={self.name!r} status={self.status!r}>"


class ProductCategoryMapping(Base):
    __tablename__ = "product_category_mappings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("analysis_reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_audit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("category_audits.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
