# backend/routes_seed.py

from __future__ import annotations

import uuid
import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import delete

from .database import get_db
from .models import (
    AIModel,
    EvidenceSource,
    AuditPolicy,
    AuditRun,
    AuditSummary,
    AuditMetricScore,
    AuditFinding,
    AuditInteraction,
)

# ✅ MUST be named "router"
router = APIRouter(tags=["Dev Seed"])


# =========================================================
# HELPERS
# =========================================================

def _now() -> datetime:
    return datetime.utcnow()


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _band(score100: float) -> str:
    s = max(0.0, min(100.0, float(score100)))
    if s >= 90:
        return "CRITICAL"
    if s >= 75:
        return "SEVERE"
    if s >= 60:
        return "HIGH"
    if s >= 40:
        return "MODERATE"
    return "LOW"


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def _rand01(mean: float, spread: float = 0.25) -> float:
    return _clamp01(random.uniform(mean - spread, mean + spread))


def _score100_from_lir(L: float, I: float, R: float, alpha: float = 1.0, beta: float = 1.5) -> float:
    # ✅ enterprise scoring formula (stable)
    # severity_score in 0..1
    severity = _clamp01((alpha * L + beta * I + R) / (alpha + beta + 1.0))
    return round(severity * 100.0, 2)


# =========================================================
# DEV SEED ENDPOINT
# =========================================================

@router.post("/dev/seed")
def dev_seed(
    clear_existing: bool = Query(default=True),
    audits_per_model: int = Query(default=12, ge=3, le=60),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Seeds DB with LIVE data for frontend pages:
    - models
    - evidence_sources
    - audit_runs
    - audit_summaries
    - audit_metric_scores
    - audit_findings (with extra JSON)
    - audit_interactions
    """

    # ---------------------------------------------------------
    # 1) Optionally clear existing data
    # ---------------------------------------------------------
    if clear_existing:
        # delete order (child → parent)
        db.execute(delete(AuditFinding))
        db.execute(delete(AuditInteraction))
        db.execute(delete(AuditMetricScore))
        db.execute(delete(AuditSummary))
        db.execute(delete(AuditRun))
        db.execute(delete(AuditPolicy))
        db.execute(delete(EvidenceSource))
        db.execute(delete(AIModel))
        db.commit()

    # ---------------------------------------------------------
    # 2) Create Models
    # ---------------------------------------------------------
    model_defs = [
        {
            "model_id": "mdl_gpt_policy",
            "name": "PolicyGuard GPT",
            "version": "1.2",
            "provider": "openai",
            "model": "gpt-4o-mini",
            "description": "LLM policy assistant with audit enforcement",
        },
        {
            "model_id": "mdl_fin_risk",
            "name": "FinRisk Classifier",
            "version": "2.0",
            "provider": "aws",
            "model": "sagemaker-xgboost",
            "description": "ML classifier used for credit risk decisions",
        },
        {
            "model_id": "mdl_health_assist",
            "name": "HealthAssist LLM",
            "version": "0.9",
            "provider": "azure",
            "model": "gpt-35-turbo",
            "description": "Healthcare assistant LLM with strict compliance needs",
        },
    ]

    created_models: List[AIModel] = []

    for m in model_defs:
        ai = AIModel(
            model_id=m["model_id"],
            name=m["name"],
            version=m["version"],
            model_type="llm",
            connection_type="api",
            description=m["description"],
            is_active=True,
        )
        db.add(ai)
        db.flush()

        es = EvidenceSource(
            model_id=ai.id,
            source_type="api",
            config={
                "provider": m["provider"],
                "model": m["model"],
                "base_url": "https://example.com",
                "api_key": "DUMMY_KEY",
            },
            read_only=True,
            last_data_snapshot={"note": "seed snapshot"},
            last_fetch_at=_now(),
        )
        db.add(es)

        pol = AuditPolicy(
            model_id=ai.id,
            audit_frequency="daily",
            baseline_strategy="previous_audit",
            audit_scope={
                "drift": True,
                "bias": True,
                "risk": True,
                "compliance": True,
                "active_security": False,
            },
            policy_reference={"seed": True},
            active_audit_enabled=False,
            last_run_at=None,
        )
        db.add(pol)

        created_models.append(ai)

    db.commit()

    # ---------------------------------------------------------
    # 3) Create Audit Runs + Metrics + Findings
    # ---------------------------------------------------------
    metric_names = ["bias", "pii", "hallucination", "drift", "compliance"]

    total_audits = 0
    total_scores = 0
    total_findings = 0
    total_interactions = 0

    base_time = _now() - timedelta(days=audits_per_model)

    for model in created_models:
        for i in range(audits_per_model):
            executed_at = base_time + timedelta(days=i, hours=random.randint(0, 6))

            run = AuditRun(
                audit_id=_uid("audit"),
                model_id=model.id,
                audit_type="passive",
                scheduled_at=executed_at - timedelta(minutes=10),
                executed_at=executed_at,
                execution_status="SUCCESS",
                audit_result=random.choice(["AUDIT_PASS", "AUDIT_WARN", "AUDIT_PASS"]),
            )
            db.add(run)
            db.flush()
            total_audits += 1

            # -------------------------------------------------
            # Summary
            # -------------------------------------------------
            drift_score = round(random.uniform(0, 100), 2)
            bias_score = round(random.uniform(0, 100), 2)
            risk_score = round(random.uniform(20, 85), 2)

            summ = AuditSummary(
                audit_id=run.id,
                drift_score=drift_score,
                bias_score=bias_score,
                risk_score=risk_score,
                total_findings=0,
                critical_findings=0,
                high_findings=0,
                metrics_snapshot={
                    "seed": True,
                    "generated_at": executed_at.isoformat(),
                },
            )
            db.add(summ)

            # -------------------------------------------------
            # Interactions (prompt evidence)
            # -------------------------------------------------
            interactions: List[AuditInteraction] = []
            for k in range(random.randint(2, 6)):
                p_id = _uid("prompt")
                inter = AuditInteraction(
                    audit_id=run.id,
                    prompt_id=p_id,
                    prompt=f"Seed prompt {k+1}: explain risks of {random.choice(['bias', 'PII', 'hallucination'])}",
                    response="Seed response: model output text goes here",
                    latency=round(random.uniform(0.15, 2.5), 3),
                    created_at=executed_at + timedelta(seconds=k * 10),
                )
                db.add(inter)
                db.flush()
                interactions.append(inter)
                total_interactions += 1

            # -------------------------------------------------
            # Metric Scores + Findings
            # -------------------------------------------------
            critical_count = 0
            high_count = 0
            findings_count_for_run = 0

            for metric in metric_names:
                # Generate L/I/R
                base_mean = {
                    "bias": 0.45,
                    "pii": 0.55,
                    "hallucination": 0.50,
                    "drift": 0.40,
                    "compliance": 0.35,
                }.get(metric, 0.4)

                L = _rand01(base_mean, 0.20)
                I = _rand01(base_mean, 0.20)
                R = _rand01(base_mean, 0.15)

                alpha = 1.0
                beta = 1.5

                score100 = _score100_from_lir(L, I, R, alpha=alpha, beta=beta)
                band = _band(score100)

                score = AuditMetricScore(
                    audit_id=run.id,
                    metric_name=metric,
                    likelihood=L,
                    impact=I,
                    regulatory_weight=R,
                    alpha=alpha,
                    beta=beta,
                    severity_score=round(score100 / 100.0, 4),
                    severity_score_100=score100,
                    severity_band=band,
                    strategic_weight=1.0,
                    framework_breakdown={
                        "GDPR": int(random.uniform(40, 95)),
                        "EU_AI_ACT": int(random.uniform(40, 95)),
                        "OWASP_AI": int(random.uniform(40, 95)),
                    },
                    signals={
                        "sample_size": random.randint(50, 500),
                        "alerts": random.randint(0, 40),
                        "reproducibility": random.choice(["low", "medium", "high"]),
                    },
                    created_at=executed_at,
                )
                db.add(score)
                total_scores += 1

                # Create findings depending on severity
                finding_count = 0
                if score100 >= 75:
                    finding_count = random.randint(2, 5)
                elif score100 >= 55:
                    finding_count = random.randint(1, 3)
                else:
                    finding_count = random.randint(0, 2)

                for fidx in range(finding_count):
                    related_interaction = random.choice(interactions) if interactions else None

                    sev = "LOW"
                    if score100 >= 90:
                        sev = "CRITICAL"
                    elif score100 >= 75:
                        sev = "HIGH"
                    elif score100 >= 55:
                        sev = "MEDIUM"
                    else:
                        sev = random.choice(["LOW", "MEDIUM"])

                    if sev == "CRITICAL":
                        critical_count += 1
                    if sev == "HIGH":
                        high_count += 1

                    category = {
                        "bias": random.choice(["Gender Bias", "Racial Bias", "Regional Bias", "Toxicity"]),
                        "pii": random.choice(["PII Exposure", "Sensitive Data Leakage", "Unsafe Logging"]),
                        "hallucination": random.choice(["False Claim", "Fabricated Citation", "Incorrect Policy"]),
                        "drift": random.choice(["Data Drift", "Concept Drift", "Feature Distribution Shift"]),
                        "compliance": random.choice(["GDPR", "EU AI Act", "OWASP AI", "Internal Policy"]),
                    }.get(metric, "General")

                    extra: Dict[str, Any] = {}

                    # ✅ PII types for /metrics/pii/categories
                    if metric == "pii":
                        extra = {
                            "pii_type": random.choice(
                                ["EMAIL", "PHONE", "PAN", "AADHAAR", "ADDRESS", "DOB", "IP_ADDRESS"]
                            ),
                            "source": random.choice(["prompt", "response", "logs"]),
                            "confidence": round(random.uniform(0.4, 0.99), 2),
                        }

                    # ✅ Compliance regulations for /metrics/compliance/regulations
                    if metric == "compliance":
                        extra = {
                            "regulation_scores": {
                                "GDPR": int(random.uniform(40, 95)),
                                "EUAI": int(random.uniform(40, 95)),
                                "OWASP_AI": int(random.uniform(40, 95)),
                            },
                            "policy_id": random.choice(["POL-001", "POL-SEC-07", "POL-AI-12"]),
                        }

                    finding = AuditFinding(
                        finding_id=_uid("finding"),
                        audit_id=run.id,
                        prompt_id=related_interaction.prompt_id if related_interaction else None,
                        interaction_id=related_interaction.id if related_interaction else None,
                        category=category,
                        rule_id=random.choice(["R-001", "R-002", "R-003", None]),
                        severity=sev,
                        metric_name=metric,
                        baseline_value=round(random.uniform(0.05, 0.55), 3),
                        current_value=round(random.uniform(0.20, 0.95), 3),
                        deviation_percentage=round(random.uniform(1, 80), 2),
                        description=f"[Seed] {metric.upper()} finding detected in {category}",
                        extra=extra or {"seed": True},
                    )
                    db.add(finding)

                    findings_count_for_run += 1
                    total_findings += 1

            # Update summary counts
            summ.total_findings = findings_count_for_run
            summ.critical_findings = critical_count
            summ.high_findings = high_count

    db.commit()

    return {
        "status": "OK",
        "clear_existing": clear_existing,
        "models_created": len(created_models),
        "audits_created": total_audits,
        "metric_scores_created": total_scores,
        "findings_created": total_findings,
        "interactions_created": total_interactions,
        "message": "✅ Seed data inserted successfully. Your frontend should now show LIVE data.",
    }
