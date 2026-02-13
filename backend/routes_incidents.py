# backend/routes_incidents.py

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from .database import get_db
from .models import AIModel, AuditRun, AuditFinding


router = APIRouter(prefix="/incidents", tags=["Incidents"])


def _iso(dt) -> Optional[str]:
    return dt.isoformat() if dt else None


@router.get("")
def list_incidents(
    model_id: Optional[str] = Query(default=None, description="Filter by AIModel.model_id"),
    severity: Optional[str] = Query(default=None, description="CRITICAL | HIGH | MEDIUM | LOW"),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    ✅ LIVE Incidents API:
    Incidents are derived from real AuditFinding rows (HIGH/CRITICAL etc.)
    """

    q = (
        db.query(AuditFinding, AuditRun, AIModel)
        .join(AuditRun, AuditFinding.audit_id == AuditRun.id)
        .join(AIModel, AuditRun.model_id == AIModel.id)
    )

    if model_id:
        q = q.filter(AIModel.model_id == model_id)

    if severity:
        q = q.filter(func.upper(AuditFinding.severity) == severity.strip().upper())

    q = q.order_by(desc(AuditRun.executed_at)).limit(limit)

    rows = q.all()

    incidents: List[Dict[str, Any]] = []

    for f, ar, m in rows:
        incidents.append(
            {
                "id": f.finding_id,
                "severity": (f.severity or "LOW").upper(),
                "incidentType": f.category or "Incident",
                "model": m.name or m.model_id,
                "model_id": m.model_id,
                "audit_id": ar.audit_id,
                "date": _iso(ar.executed_at),
                "ruleViolated": f.rule_id or f.metric_name or "N/A",
                "description": f.description or "",
            }
        )

    return {
        "status": "OK",
        "model_id": model_id,
        "severity": severity,
        "count": len(incidents),
        "incidents": incidents,
    }
