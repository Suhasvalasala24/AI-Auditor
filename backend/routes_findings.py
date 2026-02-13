# backend/routes_findings.py

from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from .database import get_db
from .models import AIModel, AuditRun, AuditFinding

router = APIRouter(prefix="/findings", tags=["Findings"])


@router.get("")
def list_findings(
    model_id: Optional[str] = Query(default=None),
    audit_id: Optional[str] = Query(default=None),
    metric_name: Optional[str] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    q = db.query(AuditFinding)

    # filter by audit_id
    if audit_id:
        run = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
        if not run:
            raise HTTPException(404, f"Audit not found: {audit_id}")
        q = q.filter(AuditFinding.audit_id == run.id)

    # filter by model_id
    if model_id:
        model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
        if not model:
            raise HTTPException(404, f"Model not found: {model_id}")

        q = (
            q.join(AuditRun, AuditFinding.audit_id == AuditRun.id)
            .filter(AuditRun.model_id == model.id)
        )

    if metric_name:
        q = q.filter(func.lower(AuditFinding.metric_name) == metric_name.lower())

    if severity:
        q = q.filter(func.upper(AuditFinding.severity) == severity.upper())

    rows: List[AuditFinding] = q.order_by(desc(AuditFinding.id)).limit(limit).all()

    findings_out = []
    for f in rows:
        findings_out.append(
            {
                "finding_id": f.finding_id,
                "audit_db_id": f.audit_id,
                "prompt_id": f.prompt_id,
                "interaction_id": f.interaction_id,
                "category": f.category,
                "rule_id": f.rule_id,
                "severity": f.severity,
                "metric_name": f.metric_name,
                "baseline_value": f.baseline_value,
                "current_value": f.current_value,
                "deviation_percentage": f.deviation_percentage,
                "description": f.description,
            }
        )

    return {
        "status": "OK",
        "count": len(findings_out),
        "findings": findings_out,
    }


@router.get("/{finding_id}")
def get_finding(
    finding_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    f = db.query(AuditFinding).filter(AuditFinding.finding_id == finding_id).first()
    if not f:
        raise HTTPException(404, f"Finding not found: {finding_id}")

    return {
        "status": "OK",
        "finding": {
            "finding_id": f.finding_id,
            "audit_db_id": f.audit_id,
            "prompt_id": f.prompt_id,
            "interaction_id": f.interaction_id,
            "category": f.category,
            "rule_id": f.rule_id,
            "severity": f.severity,
            "metric_name": f.metric_name,
            "baseline_value": f.baseline_value,
            "current_value": f.current_value,
            "deviation_percentage": f.deviation_percentage,
            "description": f.description,
        },
    }
