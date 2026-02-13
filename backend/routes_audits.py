# backend/routes_audits.py

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .database import get_db
from .models import AIModel, AuditPolicy
from .audit_engine import AuditEngine


router = APIRouter(prefix="/audits", tags=["Audits"])


@router.post("/run")
def run_audit(
    model_id: str = Query(..., description="Public model_id (AIModel.model_id)"),
    mode: str = Query(default="active", description="active | passive"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    ✅ Run a REAL audit and persist results to DB.

    - mode=active  -> uses AuditEngine.run_active_audit()
    - mode=passive -> currently NOT implemented in your audit_engine.py
                     (we keep the route for enterprise completeness)

    This endpoint is what makes ALL pages go LIVE without placeholders.
    """

    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail=f"Model not found: {model_id}")

    mode = (mode or "active").strip().lower()
    if mode not in ("active", "passive"):
        raise HTTPException(status_code=400, detail="mode must be 'active' or 'passive'")

    # If policy exists, attach it (optional)
    policy = db.query(AuditPolicy).filter(AuditPolicy.model_id == model.id).first()

    engine = AuditEngine(db)

    if mode == "passive":
        # You currently do NOT have run_passive_audit() implemented in audit_engine.py
        # So we keep this blocked until you add passive audits.
        raise HTTPException(
            status_code=501,
            detail="Passive audit is not implemented yet. Use mode=active for now.",
        )

    # ✅ ACTIVE AUDIT (REAL)
    audit = engine.run_active_audit(model=model, policy=policy)

    # Update policy last_run_at
    if policy:
        policy.last_run_at = datetime.utcnow()
        db.commit()

    return {
        "status": "OK",
        "message": "✅ Audit completed successfully",
        "mode": mode,
        "audit": {
            "audit_id": audit.audit_id,
            "model_id": model.model_id,
            "audit_type": audit.audit_type,
            "executed_at": audit.executed_at.isoformat() if audit.executed_at else None,
            "execution_status": audit.execution_status,
            "audit_result": audit.audit_result,
        },
    }
