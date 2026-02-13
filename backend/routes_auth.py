# backend/routes_auth.py

from __future__ import annotations

import os
import time
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field
from jose import jwt, JWTError

# ✅ IMPORTANT:
# This file MUST export "router" (not routes, not app)
router = APIRouter(prefix="/auth", tags=["Auth"])


# =========================================================
# Enterprise Config
# =========================================================

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-this")
JWT_ALGO = os.environ.get("JWT_ALGO", "HS256")
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "720"))  # 12h default

# Demo users (enterprise placeholder)
# Later: move to DB table users + hashed passwords + orgs + roles
DEMO_USERS = {
    "admin": {
        "username": "admin",
        "password": "admin",  # ✅ keep for now (enterprise demo)
        "name": "Admin User",
        "role": "ADMIN",
        "org_id": "default-org",
        "email": "admin@local.dev",
        "is_active": True,
    }
}


# =========================================================
# Schemas
# =========================================================

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=1, max_length=120)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user: Dict[str, Any]


class MeResponse(BaseModel):
    ok: bool
    user: Dict[str, Any]


# =========================================================
# JWT Helpers
# =========================================================

def _create_token(payload: dict, expires_minutes: int) -> str:
    now = datetime.utcnow()
    exp = now + timedelta(minutes=expires_minutes)

    to_encode = {
        **payload,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": f"jti_{uuid.uuid4().hex[:16]}",
    }

    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGO)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def _get_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    auth = authorization.strip()
    if not auth.lower().startswith("bearer "):
        return None
    return auth.split(" ", 1)[1].strip()


# =========================================================
# Dependencies
# =========================================================

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    token = _get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    decoded = _decode_token(token)
    username = decoded.get("sub")

    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # For now we load from DEMO_USERS
    u = DEMO_USERS.get(username)
    if not u or not u.get("is_active"):
        raise HTTPException(status_code=401, detail="User not found or disabled")

    return {
        "username": u["username"],
        "name": u.get("name") or u["username"],
        "role": u.get("role") or "MEMBER",
        "org_id": u.get("org_id") or "default-org",
        "email": u.get("email") or "",
    }


# =========================================================
# Routes
# =========================================================

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    """
    ✅ Enterprise login endpoint
    For now: demo user in-memory.
    Later: DB users + bcrypt + organizations + RBAC.
    """

    username = payload.username.strip()
    password = payload.password

    user = DEMO_USERS.get(username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="User disabled")

    if password != user.get("password"):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = _create_token(
        payload={
            "sub": username,
            "role": user.get("role", "MEMBER"),
            "org_id": user.get("org_id", "default-org"),
        },
        expires_minutes=JWT_EXPIRE_MINUTES,
    )

    expires_in_seconds = JWT_EXPIRE_MINUTES * 60

    safe_user = {
        "username": user["username"],
        "name": user.get("name") or user["username"],
        "role": user.get("role") or "MEMBER",
        "org_id": user.get("org_id") or "default-org",
        "email": user.get("email") or "",
    }

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in_seconds=expires_in_seconds,
        user=safe_user,
    )


@router.get("/me", response_model=MeResponse)
def me(user: Dict[str, Any] = Depends(get_current_user)):
    """
    ✅ Enterprise "who am I" endpoint
    Used by frontend to validate session
    """
    return {"ok": True, "user": user}


@router.post("/logout")
def logout():
    """
    ✅ Stateless JWT logout placeholder.
    In real SaaS: add token blacklist / sessions table.
    """
    return {"ok": True, "message": "Logged out (client should delete token)."}
