from __future__ import annotations

import uuid
import threading
import asyncio
import httpx
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from .models import (
    AIModel,
    AuditRun,
    AuditFinding,
    AuditInteraction,
    AuditMetricScore,
    AuditSummary,
    EvidenceSource,
)

from .model_executor import ModelExecutor
from .audit_prompts import PROMPT_CATEGORIES

# ✅ IMPORT ALL METRICS
from .metrics.bias import BiasMetric
from .metrics.pii import PIIMetric
from .metrics.hallucination import HallucinationMetric
from .metrics.compliance import ComplianceMetric
from .metrics.drift import DriftMetric
from .metrics.phi import PHIMetric  # Added

from .scoring.normalization import IMPACT_BASELINES, clamp01
from .scoring.metrics import MetricScore, normalize_likelihood
from .scoring.regulatory_engine import compute_regulatory_weight
from .scoring.severity_engine import (
    score_metric_severity,
    score_global_severity,
    severity_band_from_score_100,
)

import logging

logger = logging.getLogger("ai-auditor")

CATEGORY_MAP = {
    "bias": "bias",
    "bias_score": "bias",
    "hallucination": "hallucination",
    "hallucination_score": "hallucination",
    "pii": "pii",
    "pii_score": "pii",
    "system": "compliance",
    "compliance": "compliance",
    "drift": "drift",
    "phi": "phi",
    "medical": "phi"
}

METRIC_FAMILIES = ["bias", "pii", "hallucination", "compliance", "drift", "phi"]


def _norm(name: str) -> str:
    return (name or "").strip().lower()


def _metric_family(category: str, metric_name: str) -> str:
    c = _norm(category)
    m = _norm(metric_name)

    if m in METRIC_FAMILIES:
        return m

    for fam in METRIC_FAMILIES:
        if m.startswith(fam + "_"):
            return fam

    if c in METRIC_FAMILIES:
        return c

    return "compliance"


def _compute_likelihood(
    findings: List[Dict[str, Any]],
    interactions_count: int,
) -> Dict[str, Dict[str, Any]]:
    """
    Computes the Likelihood (L) score based on the frequency of findings relative to total prompts.
    """
    per_metric_count: Dict[str, int] = {}
    detailed_counts: Dict[str, Dict[str, int]] = {}

    for f in findings:
        fam = _metric_family(f.get("category", ""), f.get("metric_name", ""))
        per_metric_count[fam] = per_metric_count.get(fam, 0) + 1
        
        if fam not in detailed_counts:
            detailed_counts[fam] = {}
        m_name = f.get("metric_name", "unknown")
        detailed_counts[fam][m_name] = detailed_counts[fam].get(m_name, 0) + 1

    denom = max(1, int(interactions_count))

    out: Dict[str, Dict[str, Any]] = {}
    for metric, cnt in per_metric_count.items():
        freq_ratio = float(cnt / denom)
        freq_ratio = float(min(freq_ratio, 1.0))

        L = float(normalize_likelihood(freq_ratio))

        signals_data = {
            "finding_count": int(cnt),
            "interactions": int(interactions_count),
            "frequency_ratio": round(freq_ratio, 4),
        }
        signals_data.update(detailed_counts.get(metric, {}))

        out[metric] = {
            "L": L,
            "signals": signals_data,
        }

    for fam in METRIC_FAMILIES:
        if fam not in out:
            out[fam] = {
                "L": 0.0,
                "signals": {
                    "finding_count": 0,
                    "interactions": int(interactions_count),
                    "frequency_ratio": 0.0,
                },
            }

    return out


class AuditEngine:
    def __init__(self, db: Session):
        self.db = db

        self.metric_registry = {
            "hallucination": HallucinationMetric(),
            "bias": BiasMetric(),
            "pii": PIIMetric(),
            "compliance": ComplianceMetric(),
            "drift": DriftMetric(),
            "phi": PHIMetric(),
        }

    def run_active_audit(
        self,
        model: AIModel,
        policy=None,
        audit_public_id: Optional[str] = None,
        cancel_event: threading.Event = None
    ) -> AuditRun:

        evidence = (
            self.db.query(EvidenceSource)
            .filter(
                EvidenceSource.model_id == model.id,
                EvidenceSource.source_type == "api",
            )
            .first()
        )
        if not evidence:
            raise RuntimeError("No EvidenceSource configured for this model")

        executor = ModelExecutor(evidence.config)
        audit: Optional[AuditRun] = None

        if audit_public_id:
            audit = self.db.query(AuditRun).filter(AuditRun.audit_id == audit_public_id).first()
            if not audit:
                raise RuntimeError(f"AuditRun not found for audit_id={audit_public_id}")

            if audit.execution_status == "CANCELLED":
                return audit

            # ---------------------------------------------------------
            # INITIALIZE PROGRESS & STATUS
            # ---------------------------------------------------------
            flat_prompts = []
            for category, prompts in PROMPT_CATEGORIES.items():
                if isinstance(prompts, list):
                    for p in prompts:
                        flat_prompts.append((category, p))

            audit.total_prompts = len(flat_prompts)
            audit.current_progress = 0
            audit.execution_status = "RUNNING"
            audit.audit_result = "RUNNING"
            audit.executed_at = audit.executed_at or datetime.utcnow()
            self.db.commit()

        # ---------------------------------------------------------
        # ASYNC EXECUTION HELPERS
        # ---------------------------------------------------------
        interactions_buffer: List[Dict[str, Any]] = []
        findings_buffer: List[Dict[str, Any]] = []
        
        # ✅ REGULATORY ACCUMULATOR: Used to track coverage scores (e.g. GDPR: 0.9)
        # We start empty. If a metric provides scores, we accumulate them.
        reg_score_accumulator: Dict[str, Dict[str, float]] = {fam: {} for fam in METRIC_FAMILIES}

        stats = {
            "prompts_executed": 0,
            "total_latency_seconds": 0.0
        }

        logger.info(f"Active audit START model={model.model_id} prompts={audit.total_prompts} audit_id={audit.audit_id}")

        async def main_async_loop():
            BATCH_SIZE = 5
            # Use strict timeout
            timeout = httpx.Timeout(executor.timeout_seconds, connect=10.0) if executor.timeout_seconds else None

            async with httpx.AsyncClient(timeout=timeout) as client:
                
                for i in range(0, len(flat_prompts), BATCH_SIZE):
                    # 🛑 STOP CHECK
                    if cancel_event and cancel_event.is_set():
                        return "CANCELLED"

                    self.db.refresh(audit)
                    if audit.execution_status == "CANCELLED":
                        return "CANCELLED"

                    # Prepare the batch
                    batch = flat_prompts[i : i + BATCH_SIZE]
                    
                    # Execute batch concurrently
                    tasks = []
                    for _, p_data in batch:
                        pt = str(p_data.get("prompt") or "")
                        tasks.append(executor.execute_active_prompt_async(pt, client))
                    
                    batch_results = await asyncio.gather(*tasks, return_exceptions=True)

                    # Process results sequentially
                    for j, result in enumerate(batch_results):
                        category, p_data = batch[j]
                        prompt_id = str(p_data.get("id") or f"{category}_{uuid.uuid4().hex[:6]}")
                        prompt_text = str(p_data.get("prompt") or "")

                        if not prompt_text.strip():
                            continue

                        if isinstance(result, Exception):
                            findings_buffer.append({
                                "category": "compliance",
                                "severity": "HIGH",
                                "metric_name": "execution_failure",
                                "description": str(result),
                                "prompt_id": prompt_id,
                            })
                            continue

                        response_text = result.get("content", "")
                        latency_seconds = float(result.get("latency", 0.0))

                        stats["prompts_executed"] += 1
                        stats["total_latency_seconds"] += latency_seconds

                        interactions_buffer.append({
                            "prompt_id": prompt_id,
                            "prompt": prompt_text,
                            "response": str(response_text),
                            "latency_ms": round(latency_seconds * 1000, 2),
                        })

                        metric = self.metric_registry.get(category)
                        if metric:
                            try:
                                eval_result = metric.evaluate(prompt=prompt_text, response=str(response_text or ""))
                                results_list = eval_result if isinstance(eval_result, list) else [eval_result] if eval_result else []

                                for r in results_list:
                                    fam = _metric_family(category, getattr(r, "metric", "") or category)
                                    
                                    # ✅ CRITICAL FIX: CAPTURE REGULATORY SCORES
                                    # This reads the 'extra.reg_scores' dict from the metric and saves it.
                                    if hasattr(r, "extra") and r.extra and "reg_scores" in r.extra:
                                        for reg, score in r.extra["reg_scores"].items():
                                            # Pessimistic Aggregation: We take the MIN score across all prompts.
                                            # Start at 1.0 (perfect) if first time seeing this regulation.
                                            current_min = reg_score_accumulator[fam].get(reg, 1.0)
                                            reg_score_accumulator[fam][reg] = min(current_min, float(score))

                                    findings_buffer.append({
                                        "category": CATEGORY_MAP.get(fam, fam),
                                        "severity": str(getattr(r, "severity", "LOW") or "LOW").upper(),
                                        "metric_name": str(getattr(r, "metric", fam)),
                                        "description": str(getattr(r, "explanation", "") or ""),
                                        "prompt_id": prompt_id,
                                    })
                            except Exception as e:
                                logger.error(f"Metric evaluation error for {prompt_id}: {e}")

                    # ✅ UPDATE PROGRESS IN DB (Batched Update)
                    audit.current_progress = min(i + BATCH_SIZE, audit.total_prompts)
                    self.db.commit()
            
            return "COMPLETED"

        # ---------------------------------------------------------
        # EXECUTE LOOP
        # ---------------------------------------------------------
        status = asyncio.run(main_async_loop())

        if status == "CANCELLED":
            audit.execution_status = "CANCELLED"
            audit.audit_result = "CANCELLED"
            self.db.commit()
            return audit

        # ---------------------------------------------------------
        # PERSIST RESULTS
        # ---------------------------------------------------------
        prompt_to_interaction_id: Dict[str, int] = {}
        
        # Save Interactions
        for i in interactions_buffer:
            row = AuditInteraction(
                audit_id=audit.id,
                prompt_id=i["prompt_id"],
                prompt=i["prompt"],
                response=i["response"],
                latency=i["latency_ms"],
            )
            self.db.add(row)
        self.db.flush()
        
        # Re-query to map prompt_id -> DB ID
        saved_interactions = self.db.query(AuditInteraction).filter(AuditInteraction.audit_id == audit.id).all()
        for si in saved_interactions:
            prompt_to_interaction_id[si.prompt_id] = int(si.id)

        # Save Findings
        for f in findings_buffer:
            pid = str(f.get("prompt_id") or "")
            self.db.add(AuditFinding(
                finding_id=f"finding_{uuid.uuid4().hex[:8]}",
                audit_id=audit.id,
                prompt_id=pid if pid else None,
                interaction_id=prompt_to_interaction_id.get(pid),
                category=str(f.get("category") or "compliance"),
                severity=str(f.get("severity") or "LOW"),
                metric_name=str(f.get("metric_name") or "unknown"),
                description=str(f.get("description") or ""),
            ))

        # ---------------------------------------------------------
        # SCORING (With Regulatory Fix)
        # ---------------------------------------------------------
        likelihood_map = _compute_likelihood(findings_buffer, len(interactions_buffer))
        metric_scores: List[MetricScore] = []

        for metric_name in METRIC_FAMILIES:
            L = float(likelihood_map.get(metric_name, {}).get("L", 0.0))
            I = float(IMPACT_BASELINES.get(metric_name, 0.5))
            
            # ✅ PASS ACCUMULATED SCORES TO REGULATORY ENGINE
            accumulated_regs = reg_score_accumulator.get(metric_name, {})
            finding_extra = {"reg_scores": accumulated_regs} if accumulated_regs else None
            
            R, breakdown = compute_regulatory_weight(metric_name, finding_extra=finding_extra)
            
            S, score_100 = score_metric_severity(L=L, I=I, R=float(R))
            band = severity_band_from_score_100(score_100)

            ms = MetricScore(
                metric=metric_name,
                L=clamp01(L), I=clamp01(I), R=clamp01(float(R)),
                alpha=1.0, beta=1.5, w=1.0, S=float(S),
                score_100=float(score_100), band=str(band),
                frameworks=breakdown,
                signals=likelihood_map.get(metric_name, {}).get("signals", {}),
            )
            metric_scores.append(ms)

            self.db.add(AuditMetricScore(
                audit_id=audit.id, metric_name=metric_name,
                likelihood=ms.L, impact=ms.I, regulatory_weight=ms.R,
                alpha=ms.alpha, beta=ms.beta, severity_score=ms.S,
                severity_score_100=ms.score_100, severity_band=ms.band,
                strategic_weight=ms.w, framework_breakdown=ms.frameworks,
                signals=ms.signals
            ))

        # ---------------------------------------------------------
        # FINAL SUMMARY & CLOSE
        # ---------------------------------------------------------
        _, global_score_100, global_band = score_global_severity(metric_scores)
        
        self.db.add(AuditSummary(
            audit_id=audit.id, risk_score=float(global_score_100),
            total_findings=len(findings_buffer),
            critical_findings=sum(1 for f in findings_buffer if f["severity"] == "CRITICAL"),
            high_findings=sum(1 for f in findings_buffer if f["severity"] == "HIGH"),
            metrics_snapshot={
                "avg_latency_seconds": round(stats["total_latency_seconds"] / max(1, stats["prompts_executed"]), 3),
                "prompts_executed": stats["prompts_executed"]
            }
        ))

        # Final check for cancellation
        self.db.refresh(audit)
        if audit.execution_status == "CANCELLED":
            logger.warning(f"Audit {audit.audit_id} was cancelled externally. Not marking SUCCESS.")
            return audit

        audit.execution_status = "SUCCESS"
        audit.audit_result = "AUDIT_FAIL" if any(f["severity"] == "CRITICAL" for f in findings_buffer) else "AUDIT_PASS"
        self.db.commit()
        
        return audit