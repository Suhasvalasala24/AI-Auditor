from __future__ import annotations

from collections import Counter
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .database import get_db
from .models import AIModel, AuditRun, AuditFinding, AuditMetricScore

router = APIRouter(prefix="/metrics", tags=["Metrics"])

SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

# =========================================================
# 1. Enterprise Scoring Data (The "Live" Data)
# =========================================================

def _fetch_metric_series(db: Session, metric_name: str, model_id: str | None):
    """
    Fetches the trend history for a specific metric family (bias, pii, etc.)
    ✅ FIXED: Explicit join conditions to resolve SQLAlchemy ambiguity
    """
    q = (
        db.query(AuditMetricScore, AuditRun, AIModel)
        .join(AuditRun, AuditMetricScore.audit_id == AuditRun.id)
        .join(AIModel, AuditRun.model_id == AIModel.id)
        .filter(AuditMetricScore.metric_name == metric_name)
    )

    if model_id:
        q = q.filter(AIModel.model_id == model_id)

    # Get last 10 runs
    rows = q.order_by(AuditRun.executed_at.desc()).limit(10).all()

    series = []
    for ms, ar, m in rows:
        series.append(
            {
                "audit_id": ar.audit_id,
                "executed_at": ar.executed_at.isoformat() if ar.executed_at else None,
                "model_id": m.model_id,
                "model_name": m.name,
                "score_100": float(ms.severity_score_100 or 0.0),
                "band": str(ms.severity_band or "LOW"),
                "L": float(ms.likelihood or 0.0),
                "I": float(ms.impact or 0.0),
                "R": float(ms.regulatory_weight or 0.0),
                "frameworks": ms.framework_breakdown or {},
                "signals": ms.signals or {},
            }
        )

    return series


def _metric_payload_new_scoring(db: Session, metric_name: str, model_id: str | None):
    series = _fetch_metric_series(db, metric_name, model_id)

    if not series:
        return {
            "metric": metric_name,
            "status": "NO_DATA",
            "latest": None,
            "trend": [],
        }

    return {
        "metric": metric_name,
        "status": "OK",
        "latest": series[0],  # The most recent run
        "trend": list(reversed(series)),  # Oldest -> Newest for charts
    }


# =========================================================
# 2. Legacy Counts (For Pie Charts & Summaries)
# =========================================================

def _legacy_counts_payload(db: Session, category: str, model_id: str | None):
    """
    Aggregates findings for pie charts (Critical vs High vs Low)
    ✅ FIXED: Explicit join conditions here too
    """
    q = (
        db.query(AuditFinding)
        .join(AuditRun, AuditFinding.audit_id == AuditRun.id)
        .join(AIModel, AuditRun.model_id == AIModel.id)
        .filter(AuditFinding.category == category)
    )

    if model_id:
        q = q.filter(AIModel.model_id == model_id)

    findings = q.all()
    severity_counts = Counter((f.severity or "UNKNOWN").upper() for f in findings)

    # Total models calculation
    if model_id:
        total_models = db.query(AIModel).filter(AIModel.model_id == model_id).count()
    else:
        total_models = db.query(AIModel).count()

    # Impacted models count
    models_impacted = len({f.audit_run.model_id for f in findings if f.audit_run})

    return {
        "totalModelsAnalyzed": total_models,
        "modelsWithIssues": models_impacted,
        "totalIssues": len(findings),
        "severityData": [
            {"label": sev, "value": int(severity_counts.get(sev, 0))}
            for sev in SEVERITY_ORDER
        ],
        # Specifics for certain dashboards
        "totalViolations": len(findings), 
        "violationsBySeverity": [
             {"severity": sev, "count": int(severity_counts.get(sev, 0))}
             for sev in SEVERITY_ORDER
        ]
    }


# =========================================================
# 3. Endpoints
# =========================================================

@router.get("/bias")
def bias_metrics(model_id: str | None = Query(None), db: Session = Depends(get_db)):
    legacy = _legacy_counts_payload(db, "bias", model_id)
    scoring = _metric_payload_new_scoring(db, "bias", model_id)
    return {**legacy, "scoring": scoring}

@router.get("/pii")
def pii_metrics(model_id: str | None = Query(None), db: Session = Depends(get_db)):
    legacy = _legacy_counts_payload(db, "pii", model_id)
    scoring = _metric_payload_new_scoring(db, "pii", model_id)
    return {**legacy, "scoring": scoring}

@router.get("/hallucination")
def hallucination_metrics(model_id: str | None = Query(None), db: Session = Depends(get_db)):
    legacy = _legacy_counts_payload(db, "hallucination", model_id)
    scoring = _metric_payload_new_scoring(db, "hallucination", model_id)
    return {**legacy, "scoring": scoring}

@router.get("/compliance")
def compliance_metrics(model_id: str | None = Query(None), db: Session = Depends(get_db)):
    legacy = _legacy_counts_payload(db, "compliance", model_id)
    scoring = _metric_payload_new_scoring(db, "compliance", model_id)
    return {**legacy, "scoring": scoring}

@router.get("/drift")
def drift_metrics(model_id: str | None = Query(None), db: Session = Depends(get_db)):
    legacy = _legacy_counts_payload(db, "drift", model_id)
    scoring = _metric_payload_new_scoring(db, "drift", model_id)
    return {**legacy, "scoring": scoring}