from dotenv import load_dotenv
load_dotenv(dotenv_path=".env")

import os
import time
import uuid
import logging
from typing import Callable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# ✅ IMPORT DATABASE & ROUTER
from .database import engine, Base, init_db
from .routes import router as api_router

# ✅ IMPORT SCHEDULER
from .scheduler import scheduler

# -------------------------------------------------
# LOGGING & CONFIG
# -------------------------------------------------
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger("ai-auditor")

# Initialize DB Tables
Base.metadata.create_all(bind=engine)

# Rate Limiting Logic (In-Memory)
RATE_LIMIT_ENABLED = os.environ.get("RATE_LIMIT_ENABLED", "false").lower() == "true"
RATE_LIMIT_RPM = 120
_rate_bucket = {}

def _rate_limit_ok(ip: str) -> bool:
    now = int(time.time())
    window = now // 60
    state = _rate_bucket.get(ip)

    if state is None or state["window"] != window:
        _rate_bucket[ip] = {"window": window, "count": 1}
        return True

    if state["count"] >= RATE_LIMIT_RPM:
        return False

    state["count"] += 1
    return True

# -------------------------------------------------
# FASTAPI APPLICATION SETUP
# -------------------------------------------------
app = FastAPI(
    title="AI Auditor Backend",
    description="Enterprise AI Governance Platform API",
    version="2.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with exact frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enterprise Middleware (Logging & Rate Limit)
@app.middleware("http")
async def enterprise_middleware(request: Request, call_next: Callable):
    request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:12]}"
    ip = request.client.host if request.client else "unknown"

    # Rate Limit Check
    if RATE_LIMIT_ENABLED and not _rate_limit_ok(ip):
        return JSONResponse(
            status_code=429,
            content={
                "status": "ERROR",
                "error": "RATE_LIMITED",
                "message": "Too many requests. Please retry later.",
                "request_id": request_id,
            },
            headers={"x-request-id": request_id},
        )

    start = time.time()

    try:
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 2)

        # Inject Request ID into Response Headers
        response.headers["x-request-id"] = request_id
        response.headers["x-response-time-ms"] = str(duration_ms)

        logger.info(
            f"{request.method} {request.url.path} ip={ip} req_id={request_id} status={response.status_code} dur={duration_ms}ms"
        )
        return response

    except Exception as exc:
        duration_ms = round((time.time() - start) * 1000, 2)
        logger.exception(
            f"Unhandled exception req_id={request_id} path={request.url.path} ip={ip} dur={duration_ms}ms error={str(exc)}"
        )

        return JSONResponse(
            status_code=500,
            content={
                "status": "ERROR",
                "error": "INTERNAL_SERVER_ERROR",
                "message": "Something went wrong. Please contact support with request_id.",
                "request_id": request_id,
            },
            headers={"x-request-id": request_id},
        )

# -------------------------------------------------
# ROUTE REGISTRATION
# -------------------------------------------------
# We mount all logic under /api
app.include_router(api_router, prefix="/api")

# -------------------------------------------------
# STARTUP & SHUTDOWN EVENTS
# -------------------------------------------------
@app.on_event("startup")
async def startup_event():
    # 1. Initialize DB (if using init_db logic)
    # init_db() 
    
    # 2. Start APScheduler
    logger.info("🚀 AI Auditor: Starting Scheduler...")
    if not scheduler.running:
        scheduler.start()
    
    logger.info("Backend Started Successfully ✅")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 AI Auditor: Shutting down Scheduler...")
    if scheduler.running:
        scheduler.shutdown()
    logger.info("Backend Stopped ✅")

# -------------------------------------------------
# HEALTH CHECK
# -------------------------------------------------
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "AI Auditor",
        "scheduler": "running" if scheduler.running else "stopped"
    }

# -------------------------------------------------
# ENTRY POINT
# -------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )