# backend/routes_dashboard.py

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .database import get_db
from .models import AIModel, AuditRun, AuditSummary, AuditMetricScore, AuditFinding


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# =========================================================
# Helpers
# =========================================================

def _iso(dt: Optional[datetime]):
    return dt.isoformat() if dt else None


def _safe_float(v, default=0.0) -> float:
    try:
        return float(v)
    except Exception:
        return float(default)


def _safe_int(v, default=0) -> int:
    try:
        return int(v)
    except Exception:
        return int(default)


def _norm_sev(s: str | None) -> str:
    return (s or "").strip().upper()


def _bucket_day(dt: datetime):
    return dt.strftime("%Y-%m-%d")


def _bucket_week(dt: datetime):
    # ISO week bucket like 2026-W03
    iso_year, iso_week, _ = dt.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def _bucket_month(dt: datetime):
    return dt.strftime("%Y-%m")


def _series_from_buckets(buckets: Dict[str, List[float]]) -> List[Dict[str, Any]]:
    """
    Converts bucket map -> sorted series
    Each bucket is averaged
    """
    out = []
    for k in sorted(buckets.keys()):
        vals = buckets[k]
        if not vals:
            continue
        avg = sum(vals) / max(1, len(vals))
        out.append({"name": k, "value": round(float(avg), 2)})
    return out


def _aggregate_trend_from_audit_summaries(rows: List[Tuple[AuditRun, AuditSummary]]) -> Dict[str, Any]:
    """
    Build three trend levels from AuditSummary risk_score:
    - oneMonth: daily (last 30d)
    - sixMonths: weekly (last 26w)
    - oneYear: monthly (last 12m)
    """
    daily = defaultdict(list)
    weekly = defaultdict(list)
    monthly = defaultdict(list)

    for ar, s in rows:
        if not ar.executed_at:
            continue

        score = _safe_float(getattr(s, "risk_score", 0.0), 0.0)

        daily[_bucket_day(ar.executed_at)].append(score)
        weekly[_bucket_week(ar.executed_at)].append(score)
        monthly[_bucket_month(ar.executed_at)].append(score)

    return {
        "oneMonth": _series_from_buckets(daily),
        "sixMonths": _series_from_buckets(weekly),
        "oneYear": _series_from_buckets(monthly),
    }


def _aggregate_trend_from_metric_scores(rows: List[Tuple[AuditRun, AuditMetricScore]], metric_name: str) -> Dict[str, Any]:
    """
    Trend for one metric (bias/pii/etc) using AuditMetricScore.severity_score_100
    """
    daily = defaultdict(list)
    weekly = defaultdict(list)
    monthly = defaultdict(list)

    for ar, ms in rows:
        if not ar.executed_at:
            continue

        score = _safe_float(getattr(ms, "severity_score_100", 0.0), 0.0)

        daily[_bucket_day(ar.executed_at)].append(score)
        weekly[_bucket_week(ar.executed_at)].append(score)
        monthly[_bucket_month(ar.executed_at)].append(score)

    return {
        "metric": metric_name,
        "oneMonth": _series_from_buckets(daily),
        "sixMonths": _series_from_buckets(weekly),
        "oneYear": _series_from_buckets(monthly),
    }


# =========================================================
# Dashboard Overview (Enterprise)
# =========================================================

@router.get("/overview")
def dashboard_overview(db: Session = Depends(get_db)):
    """
    ✅ Enterprise Dashboard Overview (CISO-ready payload)

    Returns:
    - Global counts
    - Latest global risk score (safe even if no audits yet)
    - Findings severity distribution (CRITICAL/HIGH/MEDIUM/LOW)
    - Global risk trend (AuditSummary)
    - Per-metric risk trends (AuditMetricScore)
    - Top risky models (based on latest summary per model)
    """

    # ---------------------------------------------------------
    # GLOBAL COUNTS (always live)
    # ---------------------------------------------------------
    total_models = db.query(AIModel).count()
    total_audits = db.query(AuditRun).count()

    total_findings = db.query(AuditFinding).count()

    critical_findings_count = (
        db.query(AuditFinding)
        .filter(AuditFinding.severity == "CRITICAL")
        .count()
    )

    high_findings_count = (
        db.query(AuditFinding)
        .filter(AuditFinding.severity == "HIGH")
        .count()
    )

    medium_findings_count = (
        db.query(AuditFinding)
        .filter(AuditFinding.severity == "MEDIUM")
        .count()
    )

    low_findings_count = (
        db.query(AuditFinding)
        .filter(AuditFinding.severity == "LOW")
        .count()
    )

    failed_audits = (
        db.query(AuditRun)
        .filter(AuditRun.audit_result.in_(["AUDIT_FAIL"]))
        .count()
    )

    # ---------------------------------------------------------
    # LATEST GLOBAL SUMMARY (SAFE)
    # ---------------------------------------------------------
    latest_summary = (
        db.query(AuditSummary)
        .order_by(AuditSummary.id.desc())
        .first()
    )

    # ✅ Fix: latest_summary can be None
    overall_risk_score = 0.0
    if latest_summary:
        overall_risk_score = _safe_float(getattr(latest_summary, "risk_score", 0.0), 0.0)

    # ---------------------------------------------------------
    # TRENDS CUTOFFS
    # ---------------------------------------------------------
    cutoff_12m = datetime.utcnow() - timedelta(days=365)

    # ---------------------------------------------------------
    # GLOBAL TREND (AuditSummary risk_score)
    # ---------------------------------------------------------
    # Safe join: if no AuditSummary rows, trend will be empty arrays
    recent_global: List[Tuple[AuditRun, AuditSummary]] = (
        db.query(AuditRun, AuditSummary)
        .join(AuditSummary, AuditSummary.audit_id == AuditRun.id)
        .filter(AuditRun.executed_at >= cutoff_12m)
        .order_by(AuditRun.executed_at.asc())
        .all()
    )

    global_trend = _aggregate_trend_from_audit_summaries(recent_global)

    # ---------------------------------------------------------
    # PER METRIC TRENDS (AuditMetricScore)
    # ---------------------------------------------------------
    metric_names = ["bias", "pii", "hallucination", "compliance", "drift"]
    metric_trends: Dict[str, Any] = {}

    for metric in metric_names:
        metric_rows: List[Tuple[AuditRun, AuditMetricScore]] = (
            db.query(AuditRun, AuditMetricScore)
            .join(AuditMetricScore, AuditMetricScore.audit_id == AuditRun.id)
            .filter(AuditRun.executed_at >= cutoff_12m)
            .filter(AuditMetricScore.metric_name == metric)
            .order_by(AuditRun.executed_at.asc())
            .all()
        )

        metric_trends[metric] = _aggregate_trend_from_metric_scores(metric_rows, metric)

    # ---------------------------------------------------------
    # TOP RISKY MODELS (latest audit per model)
    # ---------------------------------------------------------
    models = db.query(AIModel).all()
    model_risk_rows: List[Dict[str, Any]] = []

    for m in models:
        latest_run = (
            db.query(AuditRun)
            .filter(AuditRun.model_id == m.id)
            .order_by(AuditRun.executed_at.desc())
            .first()
        )

        if not latest_run:
            continue

        latest_sum = (
            db.query(AuditSummary)
            .filter(AuditSummary.audit_id == latest_run.id)
            .first()
        )

        risk_score = _safe_float(getattr(latest_sum, "risk_score", 0.0), 0.0) if latest_sum else 0.0

        model_risk_rows.append(
            {
                "model_id": m.model_id,
                "model_name": m.name,
                "audit_id": latest_run.audit_id,
                "executed_at": _iso(latest_run.executed_at),
                "risk_score_100": round(float(risk_score), 2),
                "audit_result": latest_run.audit_result,
            }
        )

    model_risk_rows.sort(key=lambda x: float(x.get("risk_score_100") or 0.0), reverse=True)
    top_risky_models = model_risk_rows[:8]

    # ---------------------------------------------------------
    # FINAL PAYLOAD (Frontend expects metrics.* keys)
    # ---------------------------------------------------------
    return {
        "status": "OK",
        "metrics": {
            "total_models": int(total_models),
            "total_audits": int(total_audits),
            "overall_risk_score": round(float(overall_risk_score), 2),
            "failed_audits": int(failed_audits),
            "total_findings": int(total_findings),

            # ✅ Required by your Dashboard UI
            "critical_findings_count": int(critical_findings_count),
            "high_findings_count": int(high_findings_count),

            # ✅ Enterprise-ready extra fields (your Dashboard already supports optional)
            "medium_findings_count": int(medium_findings_count),
            "low_findings_count": int(low_findings_count),
        },

        # ✅ Enterprise-level trends
        "trend": global_trend,
        "metric_trends": metric_trends,

        # ✅ Executive friendly list
        "top_risky_models": top_risky_models,
    }
