# backend/routes_interactions.py

from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .database import get_db
from .models import AuditRun, AuditInteraction

router = APIRouter(prefix="/interactions", tags=["Interactions"])


@router.get("")
def list_interactions(
    audit_id: str = Query(...),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    run = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
    if not run:
        raise HTTPException(404, f"Audit not found: {audit_id}")

    rows: List[AuditInteraction] = (
        db.query(AuditInteraction)
        .filter(AuditInteraction.audit_id == run.id)
        .order_by(desc(AuditInteraction.created_at))
        .limit(limit)
        .all()
    )

    out = []
    for r in rows:
        out.append(
            {
                "prompt_id": r.prompt_id,
                "prompt": r.prompt,
                "response": r.response,
                "latency": r.latency,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
        )

    return {"status": "OK", "count": len(out), "interactions": out}


@router.get("/{prompt_id}")
def get_interaction_by_prompt_id(
    prompt_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    row = (
        db.query(AuditInteraction)
        .filter(AuditInteraction.prompt_id == prompt_id)
        .order_by(desc(AuditInteraction.created_at))
        .first()
    )

    if not row:
        raise HTTPException(404, f"Interaction not found for prompt_id={prompt_id}")

    return {
        "status": "OK",
        "interaction": {
            "prompt_id": row.prompt_id,
            "prompt": row.prompt,
            "response": row.response,
            "latency": row.latency,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        },
    }
