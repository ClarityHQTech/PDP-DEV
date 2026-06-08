"""
app/main.py
FastAPI application — PDP SEO/AEO Analysis Tool
"""
from __future__ import annotations

import json
import os
import re
import contextlib
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.logging import get_logger
from app.agents.url_detector import detect_url_type
from app.agents.mode1_graph import analyze_pdp_stream
from app.agents.site_graph import audit_site_stream

from app.core.database import init_db
from app.api.routes import auth, history

logger = get_logger(__name__)
settings = get_settings()

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Run DB init on startup
    await init_db()
    yield
    # Shutdown

app = FastAPI(title="PDP Analyzer", version="2.0.0", docs_url="/api/docs", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")


# ── Request Models ─────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    url: str

from app.core.security import ClerkUser, get_current_user
from fastapi import Depends

# ── URL Detection ──────────────────────────────────────────────────────────────
@app.post("/api/v1/detect-url")
async def detect_url(req: AnalyzeRequest, current_user: ClerkUser = Depends(get_current_user)):
    """Quick URL type detection — used by frontend to route to Mode A or B."""
    url = req.url.strip()
    url = re.sub(r'^([a-zA-Z]*://)+', '', url)
    url = "https://" + url
    result = detect_url_type(url)
    return {"mode": "B" if result["url_type"] == "product" else "A"}


# ── Mode B: Direct PDP Analysis ───────────────────────────────────────────────
@app.post("/api/v1/analyze/pdp/stream")
async def analyze_pdp(req: AnalyzeRequest, request: Request, current_user: ClerkUser = Depends(get_current_user)):
    """Stream SEO + AEO analysis for a single product page URL."""
    url = req.url.strip()
    url = re.sub(r'^([a-zA-Z]*://)+', '', url)
    url = "https://" + url

    logger.info(f"api.analyze_pdp url={url}")

    # Extract Bearer token to get user/tenant in the background
    auth_header = request.headers.get("Authorization", "")

    return StreamingResponse(
        analyze_pdp_stream(url, auth_header),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Mode A: Full Site Audit ────────────────────────────────────────────────────
@app.post("/api/v1/site/audit/stream")
async def audit_site(req: AnalyzeRequest, request: Request, current_user: ClerkUser = Depends(get_current_user)):
    """Stream full site audit (Homepage → Categories → Products)."""
    url = req.url.strip()
    url = re.sub(r'^([a-zA-Z]*://)+', '', url)
    url = "https://" + url

    logger.info(f"api.audit_site url={url}")

    # Extract Bearer token to get user/tenant in the background
    auth_header = request.headers.get("Authorization", "")

    return StreamingResponse(
        audit_site_stream(url, auth_header),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Static Files (Frontend) ───────────────────────────────────────────────────
public_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")

@app.get("/")
@app.get("/index.html")
async def serve_index():
    with open(os.path.join(public_dir, "index.html"), "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read(), status_code=200)

app.mount("/", StaticFiles(directory=public_dir, html=True), name="public")
