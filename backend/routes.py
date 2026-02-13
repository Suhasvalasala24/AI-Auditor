from __future__ import annotations

import os
import uuid
import threading
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Query, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel

# ---------------------------------------------------------
# IMPORTS
# ---------------------------------------------------------
from .database import get_db, SessionLocal
from .models import (
    AIModel, AuditRun, AuditFinding, AuditPolicy, EvidenceSource,
    AuditInteraction, AuditMetricScore, AuditSummary, User
)
from .schemas import (
    ModelResponse, AuditResponse, RegisterModelRequest, 
    UserCreate, Token, UserResponse
)
from .audit_engine import AuditEngine
from .scheduler import update_job_schedule

# Reporting & Playbooks
from .report_builder import build_structured_report
from .remediation_playbook import explain_category, remediation_steps
from .report_pdf_reportlab import generate_audit_pdf_bytes

# Security & Auth
from .auth import (
    get_password_hash, verify_password, create_access_token, 
    get_current_user, require_role, ACCESS_TOKEN_EXPIRE_MINUTES
)

logger = logging.getLogger("ai-auditor")
router = APIRouter()

# Global Registry for cancelling running audits
active_audit_tasks: Dict[str, threading.Event] = {}

# Schema for Policy Updates
class PolicyUpdate(BaseModel):
    audit_frequency: str  # manual, daily, weekly

# =========================================================
# 1. AUTHENTICATION & USERS
# =========================================================

@router.post("/auth/register", response_model=Dict[str, str])
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with role-based access."""
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_pw,
        full_name=user.full_name,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"status": "OK", "message": f"User {user.email} created successfully."}

@router.post("/auth/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 compatible token login, get an access token for future requests."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/auth/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    """Return current user info."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active
    )

# =========================================================
# 2. MODEL MANAGEMENT
# =========================================================

@router.get("/models", response_model=List[ModelResponse])
def list_models(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all registered models with their latest audit status."""
    models_list = db.query(AIModel).all()
    response = []

    for model in models_list:
        # Fetch latest audit for status summary
        last_audit = (
            db.query(AuditRun)
            .filter(AuditRun.model_id == model.id)
            .order_by(AuditRun.executed_at.desc())
            .first()
        )

        status_str = "NOT RUN"
        time_val = None
        prog, tot = 0, 0

        if last_audit:
            time_val = last_audit.executed_at
            if last_audit.execution_status in ["RUNNING", "PENDING", "CANCELLED", "FAILED"]:
                status_str = last_audit.execution_status
            else:
                status_str = last_audit.audit_result
            prog = last_audit.current_progress or 0
            tot = last_audit.total_prompts or 0

        response.append(ModelResponse(
            id=model.id,
            model_id=model.model_id,
            name=model.name,
            version=model.version,       
            model_type=model.model_type,   
            created_at=model.created_at,
            last_audit_status=status_str,
            last_audit_time=time_val,
            connection_type=model.connection_type or "api",
            current_progress=prog,
            total_prompts=tot
        ))
    return response

@router.post("/models/register-with-connector")
def register_model(payload: RegisterModelRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "auditor"]))):
    """Register a new AI model and configure its API connector."""
    if "{{PROMPT}}" not in str(payload.request_template):
        raise HTTPException(400, "Request template must contain {{PROMPT}} placeholder.")

    existing = db.query(AIModel).filter(AIModel.model_id == payload.model_id).first()
    if existing:
        raise HTTPException(400, f"Model ID '{payload.model_id}' already exists.")

    model = AIModel(
        model_id=payload.model_id,
        name=payload.name,
        model_type="llm",
        connection_type="api",
        description=getattr(payload, "description", None),
    )
    db.add(model)
    db.flush() # Get ID

    evidence = EvidenceSource(
        model_id=model.id,
        source_type="api",
        config={
            "endpoint": payload.endpoint,
            "method": getattr(payload, "method", "POST"),
            "headers": payload.headers,
            "request_template": payload.request_template,
            "response_path": payload.response_path,
        },
    )
    db.add(evidence)
    db.commit()
    return {"status": "OK", "message": "Model registered successfully"}

@router.delete("/models/{model_id}")
def delete_model(model_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    """Hard delete a model and all its audit history."""
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        raise HTTPException(404, "Model not found")

    try:
        # Cascade delete logic (if not handled by DB FKs)
        db.query(EvidenceSource).filter(EvidenceSource.model_id == model.id).delete()
        audits = db.query(AuditRun).filter(AuditRun.model_id == model.id).all()
        for audit in audits:
            db.query(AuditFinding).filter(AuditFinding.audit_id == audit.id).delete()
            db.query(AuditInteraction).filter(AuditInteraction.audit_id == audit.id).delete()
            db.query(AuditMetricScore).filter(AuditMetricScore.audit_id == audit.id).delete()
            db.query(AuditSummary).filter(AuditSummary.audit_id == audit.id).delete()
            db.delete(audit)
        
        db.delete(model)
        db.commit()
        return {"status": "OK", "message": f"Model {model_id} and all history deleted."}
    except Exception as e:
        db.rollback()
        logger.error(f"Delete failed: {e}")
        raise HTTPException(500, f"Failed to delete model: {str(e)}")

# ✅ POLICY & SCHEDULER ENDPOINT
@router.post("/models/{model_id}/policy")
def update_model_policy(
    model_id: int, 
    payload: PolicyUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["admin", "auditor"]))
):
    """
    Update the audit frequency (Manual/Daily/Weekly) and reconfigure the scheduler.
    """
    model = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not model:
        raise HTTPException(404, "Model not found")

    policy = db.query(AuditPolicy).filter(AuditPolicy.model_id == model.id).first()
    if not policy:
        policy = AuditPolicy(model_id=model.id, audit_frequency="manual", compliance_standard="EUAI")
        db.add(policy)
    
    # Update DB
    policy.audit_frequency = payload.audit_frequency
    db.commit()

    # Update Background Scheduler
    # We use the string `model_id` (e.g. "gpt-4") for the job ID
    update_job_schedule(model.model_id, payload.audit_frequency)

    return {"status": "OK", "message": f"Audit policy updated to {payload.audit_frequency}"}


# =========================================================
# 3. AUDIT EXECUTION (BACKGROUND)
# =========================================================

def _run_audit_background(model_id: str, audit_public_id: str, cancel_event: threading.Event):
    """Worker function to run the audit engine in a background thread."""
    db: Session = SessionLocal()
    try:
        logger.info(f"🚀 Starting Background Audit: {audit_public_id} for {model_id}")

        model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
        audit_row = db.query(AuditRun).filter(AuditRun.audit_id == audit_public_id).first()
        
        if not model or not audit_row:
            logger.error("Audit aborted: Database record missing.")
            return

        policy = db.query(AuditPolicy).filter(AuditPolicy.model_id == model.id).first()
        engine = AuditEngine(db)
        
        # Execute (Synchronous engine, but running in background thread)
        engine.run_active_audit(model, policy, audit_public_id, cancel_event=cancel_event)
        
        logger.info(f"✅ Audit Finished: {audit_public_id}")

    except Exception as exc:
        logger.exception(f"CRITICAL FAILURE in Audit {audit_public_id}: {exc}")
        try:
            # Attempt to mark as failed in DB
            audit_row = db.query(AuditRun).filter(AuditRun.audit_id == audit_public_id).first()
            if audit_row and audit_row.execution_status != "CANCELLED":
                audit_row.execution_status = "FAILED"
                audit_row.audit_result = "SYSTEM_ERROR"
                db.commit()
        except:
            db.rollback()
    finally:
        # Cleanup
        active_audit_tasks.pop(audit_public_id, None)
        db.close()

@router.post("/audits/model/{model_id}/run", response_model=AuditResponse)
def run_model_audit(model_id: str, bg_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "auditor"]))):
    """Trigger an immediate ad-hoc audit."""
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        raise HTTPException(404, "Model not found")

    # Prevent concurrent runs for same model (optional safety)
    existing = db.query(AuditRun).filter(
        AuditRun.model_id == model.id, 
        AuditRun.execution_status.in_([ "RUNNING", "PENDING" ])
    ).first()
    
    if existing:
        # Auto-recover if it's been stuck for > 1 hour
        if (datetime.utcnow() - existing.executed_at).total_seconds() > 3600:
            existing.execution_status = "FAILED"
            db.commit()
        else:
            raise HTTPException(400, f"Audit {existing.audit_id} is already in progress.")

    # Create Audit Record
    audit_id = f"audit_{uuid.uuid4().hex[:8]}"
    audit = AuditRun(
        audit_id=audit_id,
        model_id=model.id,
        audit_type="active",
        executed_at=datetime.utcnow(),
        execution_status="PENDING",
        audit_result="PENDING"
    )
    db.add(audit)
    db.commit()

    # Launch Background Task
    cancel_event = threading.Event()
    active_audit_tasks[audit_id] = cancel_event
    bg_tasks.add_task(_run_audit_background, model_id, audit_id, cancel_event)

    return AuditResponse(
        id=audit.id, 
        audit_id=audit_id, 
        model_id=model.id, 
        audit_type="active", 
        executed_at=audit.executed_at, 
        execution_status="PENDING", 
        audit_result="PENDING", 
        findings_count=0
    )

@router.post("/audits/{audit_id}/stop")
def stop_audit(audit_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "auditor"]))):
    """Stop a running audit."""
    if audit_id in active_audit_tasks:
        active_audit_tasks[audit_id].set() # Signal thread to stop
    
    audit = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
    if audit and audit.execution_status in ["PENDING", "RUNNING"]:
        audit.execution_status = "CANCELLED"
        audit.audit_result = "CANCELLED"
        db.commit()
        return {"status": "OK", "message": "Audit cancelled"}
    
    return {"status": "OK", "message": "Audit was not active"}

@router.get("/audits/model/{model_id}/recent")
def get_recent_audits(model_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model: raise HTTPException(404, "Model not found")

    audits = db.query(AuditRun).filter(AuditRun.model_id == model.id).order_by(AuditRun.executed_at.desc()).limit(10).all()
    return [{
        "audit_id": a.audit_id,
        "executed_at": a.executed_at,
        "audit_result": a.execution_status if a.execution_status in ["RUNNING","FAILED","CANCELLED"] else a.audit_result
    } for a in audits]


# =========================================================
# 4. REPORTING & METRICS (DATA ACCESS)
# =========================================================

@router.get("/audits/{audit_id}/interactions")
def get_interactions(audit_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch all interactions/prompts for an audit (used for counters)."""
    audit = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
    if not audit: raise HTTPException(404, "Audit not found")

    rows = db.query(AuditInteraction).filter(AuditInteraction.audit_id == audit.id).all()
    return [{"prompt_id": r.prompt_id, "category": getattr(r, "category", "")} for r in rows]

@router.get("/audits/{audit_id}/findings-grouped")
def get_grouped_report(audit_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Detailed audit report with findings, metrics, and remediation."""
    audit = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
    if not audit: raise HTTPException(404, "Audit not found")

    model = db.query(AIModel).filter(AIModel.id == audit.model_id).first()
    findings = db.query(AuditFinding).filter(AuditFinding.audit_id == audit.id).all()
    interactions = db.query(AuditInteraction).filter(AuditInteraction.audit_id == audit.id).all()
    metric_scores = db.query(AuditMetricScore).filter(AuditMetricScore.audit_id == audit.id).all()
    summary = db.query(AuditSummary).filter(AuditSummary.audit_id == audit.id).first()

    audit_meta = {
        "audit_id": audit.audit_id,
        "model_name": model.name if model else "Unknown",
        "executed_at": audit.executed_at.isoformat(),
        "execution_status": audit.execution_status,
        "audit_result": audit.audit_result
    }

    findings_list = []
    for f in findings:
        findings_list.append({
            "finding_id": f.finding_id,
            "category": f.category,
            "severity": f.severity,
            "metric_name": f.metric_name,
            "description": f.description,
            "interaction_id": f.interaction_id,
            "explain": explain_category(f.category),
            "remediation": remediation_steps(f.category, f.severity, f.metric_name)
        })

    interactions_list = []
    for i in interactions:
        interactions_list.append({
            "interaction_id": i.id,
            "prompt_id": i.prompt_id,
            "prompt": i.prompt,
            "response": i.response,
            "latency_ms": i.latency,
            "created_at": i.created_at.isoformat()
        })

    scores_list = []
    for m in metric_scores:
        scores_list.append({
            "metric": getattr(m, "metric_name", "unknown"),
            "score_100": getattr(m, "severity_score_100", 0),
            "band": getattr(m, "severity_band", "UNKNOWN"),
            "L": getattr(m, "likelihood", 0), 
            "I": getattr(m, "impact", 0),     
            "R": getattr(m, "regulatory_weight", 0)
        })

    global_risk = {"score_100": getattr(summary, "risk_score", 0) if summary else 0, "band": "N/A"}

    return build_structured_report(
        audit=audit_meta,
        findings=findings_list,
        interactions=interactions_list,
        metric_scores=scores_list,
        global_risk=global_risk
    )

@router.get("/audits/{audit_id}/download-pdf")
def download_pdf(audit_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Generate and download a PDF report."""
    data = get_grouped_report(audit_id, db, current_user)
    pdf = generate_audit_pdf_bytes(data)
    return Response(
        content=pdf, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=audit_{audit_id}.pdf"}
    )

# =========================================================
# 5. UNIFIED METRICS DASHBOARD
# =========================================================

@router.get("/dashboard/overview")
def get_dashboard_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Metrics for the main executive dashboard."""
    total_models = db.query(AIModel).count()
    total_audits = db.query(AuditRun).filter(AuditRun.execution_status == "SUCCESS").count()
    
    # Latest summaries for active models
    latest_sub = db.query(func.max(AuditRun.id)).group_by(AuditRun.model_id).scalar_subquery()
    summaries = db.query(AuditSummary).join(AuditRun).filter(AuditRun.id.in_(latest_sub)).all()
    
    count = len(summaries)
    risk = sum(s.risk_score or 0 for s in summaries) / max(1, count)
    
    return {
        "status": "OK",
        "metrics": {
            "total_models": total_models,
            "total_audits": total_audits,
            "overall_risk_score": round(risk),
            "failed_audits": len([s for s in summaries if (s.risk_score or 0) > 60]),
            "total_findings": sum(s.total_findings or 0 for s in summaries),
            "critical_findings_count": sum(s.critical_findings or 0 for s in summaries),
            "high_findings_count": sum(s.high_findings or 0 for s in summaries)
        }
    }

def _fetch_metric_score(metric_name: str, model_id: Optional[str], db: Session):
    """
    Helper to fetch scores. 
    ✅ CRITICAL: Ensures 'frameworks' data is passed to frontend.
    """
    q = db.query(AuditMetricScore).join(AuditRun).join(AIModel)
    if model_id:
        q = q.filter(AIModel.model_id == model_id)
    
    history = q.filter(
        AuditMetricScore.metric_name == metric_name, 
        AuditRun.execution_status == "SUCCESS"
    ).order_by(AuditRun.executed_at.desc()).limit(15).all()

    if not history:
        return {"metric": metric_name, "status": "NO_DATA", "latest": None, "trend": []}

    latest = history[0]
    
    fmt = lambda s: {
        "audit_id": s.audit_run.audit_id,
        "executed_at": s.audit_run.executed_at,
        "model_id": s.audit_run.model.model_id,
        "model_name": s.audit_run.model.name,
        "score_100": s.severity_score_100,
        "band": s.severity_band,
        "L": s.likelihood, 
        "I": s.impact, 
        "R": s.regulatory_weight,
        "frameworks": s.framework_breakdown or {}, # ✅ This enables the Compliance Page Charts
        "signals": s.signals or {}
    }

    return {
        "metric": metric_name,
        "status": "OK",
        "latest": fmt(latest),
        "trend": [fmt(s) for s in history][::-1]
    }

@router.get("/metrics/{metric_type}")
def get_metric_data(metric_type: str, model_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Unified endpoint for all metric pages (bias, pii, compliance, etc.)."""
    valid_metrics = ["bias", "hallucination", "pii", "compliance", "drift", "phi"]
    if metric_type not in valid_metrics:
        raise HTTPException(404, "Invalid metric type")
    
    return {"scoring": _fetch_metric_score(metric_type, model_id, db)}