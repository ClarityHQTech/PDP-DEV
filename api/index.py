import contextlib
import re
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.database import init_db
from app.core.security import ClerkUser, get_current_user
from app.api.routes import auth, history, report_export
from app.agents.url_detector import detect_url_type

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Initializes DB connection pool on cold start
    await init_db()
    yield

app = FastAPI(title="Vercel Light API", version="2.0.0", lifespan=lifespan)
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://organic360.clarityhq.ai",
        "https://organic360.vercel.app"
    ],
    allow_origin_regex=r"https://organic360(-[a-zA-Z0-9\-]+)?\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount only lightweight, DB-only routers ─────────────────────────
app.include_router(auth.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(report_export.router)

# ── Lightweight URL Detection (Pure CPU / Regex) ────────────────────
class AnalyzeRequest(BaseModel):
    url: str

@app.post("/api/v1/detect-url")
async def detect_url(req: AnalyzeRequest, current_user: ClerkUser = Depends(get_current_user)):
    url = req.url.strip()
    url = re.sub(r'^([a-zA-Z]*://)+', '', url)
    url = "https://" + url
    result = detect_url_type(url)
    return {"mode": "B" if result["url_type"] == "product" else "A"}
