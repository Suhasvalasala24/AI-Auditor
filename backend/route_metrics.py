from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from .database import get_db
from .models import (
    AuditFinding,
    AuditRun,
    AIModel,
)

router = APIRouter(prefix="/api/metrics", tags=["Metrics"])


# -------------------------------------------------
# INTERNAL HELPER
# -------------------------------------------------

def build_metric_response(category: str, db: Session):
    """
    Aggregates findings for a given metric category
    """

    findings = (
        db.query(AuditFinding, AuditRun, AIModel)
        .join(AuditRun, AuditFinding.audit_id == AuditRun.id)
        .join(AIModel, AIModel.id == AuditRun.model_id)
        .filter(AuditFinding.category == category)
        .all()
    )

    severity_count = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
    }

    model_issues = {}

    for finding, audit, model in findings:
        severity = finding.severity
        severity_count[severity] += 1

        if model.name not in model_issues:
            model_issues[model.name] = {
                "model_name": model.name,
                "issues": 0,
                "highest_severity": severity,
            }

        model_issues[model.name]["issues"] += 1

        # Escalate severity if needed
        if severity == "CRITICAL":
            model_issues[model.name]["highest_severity"] = "CRITICAL"
        elif (
            severity == "HIGH"
            and model_issues[model.name]["highest_severity"] != "CRITICAL"
        ):
            model_issues[model.name]["highest_severity"] = "HIGH"

    return {
        "total_findings": len(findings),
        "models_affected": len(model_issues),
        "severity": severity_count,
        "top_models": sorted(
            model_issues.values(),
            key=lambda x: x["issues"],
            reverse=True,
        )[:5],
    }


# -------------------------------------------------
# METRIC ROUTES
# -------------------------------------------------

@router.get("/bias")
def bias_metrics(db: Session = Depends(get_db)):
    return build_metric_response("bias", db)


@router.get("/hallucination")
def hallucination_metrics(db: Session = Depends(get_db)):
    return build_metric_response("hallucination", db)


@router.get("/pii")
def pii_metrics(db: Session = Depends(get_db)):
    return build_metric_response("pii", db)


@router.get("/compliance")
def compliance_metrics(db: Session = Depends(get_db)):
    return build_metric_response("compliance", db)


@router.get("/drift")
def drift_metrics(db: Session = Depends(get_db)):
    """
    Drift is historical — return empty safely for now
    """
    return {
        "total_findings": 0,
        "models_affected": 0,
        "severity": {
            "CRITICAL": 0,
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0,
        },
        "top_models": [],
    }
