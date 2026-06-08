"""
app/core/security.py
Verifies Clerk-issued JWTs offline using the Clerk PEM public key.
Returns a typed ClerkUser payload so every route knows who is calling.
"""
from __future__ import annotations

import json
from typing import Any

import httpx
import jwt                          # PyJWT
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

settings = get_settings()

# ── Bearer extractor ──────────────────────────────────────────────────────────
_bearer = HTTPBearer(auto_error=False)




# ── Verified user model ───────────────────────────────────────────────────────
class ClerkUser:
    """Slim wrapper around the decoded JWT claims."""

    def __init__(self, payload: dict[str, Any]) -> None:
        self._p = payload

    @property
    def clerk_id(self) -> str:          # e.g. "user_2abc..."
        return self._p["sub"]

    @property
    def email(self) -> str | None:
        emails = self._p.get("email_addresses", [])
        return emails[0].get("email_address") if emails else self._p.get("email")

    @property
    def org_id(self) -> str | None:     # Clerk Organization = Tenant
        return self._p.get("org_id")

    @property
    def raw(self) -> dict[str, Any]:
        return self._p


# ── Core verification logic ───────────────────────────────────────────────────
def _verify_jwt(token: str) -> dict[str, Any]:
    """Verify local App-issued JWT."""
    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )


_DEV_USER_PAYLOAD: dict[str, Any] = {
    "sub": "user_dev_local",
    "email": "dev@localhost",
}


# ── FastAPI dependency ────────────────────────────────────────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> ClerkUser:
    """
    FastAPI dependency – inject into any protected route:

        @router.get("/me")
        async def me(user: ClerkUser = Depends(get_current_user)):
            ...
    """
    token = credentials.credentials if credentials else None

    # Local dev bypass only when no auth provider is configured
    if (
        settings.dev_auth_bypass
        and settings.app_env == "development"
        and not settings.google_enabled
        and not settings.clerk_enabled
    ):
        if not token or token == "dev":
            return ClerkUser(_DEV_USER_PAYLOAD)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Sign in with Google or provide a Bearer token.",
        )

    # App-issued JWT (Google OAuth users)
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        if payload.get("iss") == "organic360" and payload.get("sub"):
            return ClerkUser(payload)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please sign in again.",
        )
    except jwt.PyJWTError:
        pass

    if settings.clerk_enabled:
        payload = _verify_jwt(token)
        return ClerkUser(payload)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid session. Please sign in again.",
    )
