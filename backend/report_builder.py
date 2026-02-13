from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List

SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

def _safe(v: Any) -> str:
    """Safely convert any value to string, handling None."""
    if v is None:
        return ""
    return str(v).strip()

def _norm_category(v: str) -> str:
    return _safe(v).lower()

def _norm_severity(v: str) -> str:
    return _safe(v).upper()

def _norm_metric(v: str) -> str:
    return _safe(v).lower()

def _fingerprint_dict_finding(f: Dict[str, Any]) -> str:
    """
    Creates a unique signature for grouping findings.
    Now handles extra whitespace and capitalization more aggressively.
    """
    category = _norm_category(f.get("category"))
    metric = _norm_metric(f.get("metric_name"))
    desc = _safe(f.get("description")).lower()
    # Collapse multiple spaces to one to avoid duplicate findings due to formatting
    desc = " ".join(desc.split())
    if len(desc) > 160:
        desc = desc[:160]
    return f"{category}::{metric}::{desc}"

def _severity_rank(sev: str) -> int:
    s = _norm_severity(sev)
    mapping = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
    return mapping.get(s, 0)

def build_structured_report(
    audit: Dict[str, Any],
    findings: List[Dict[str, Any]],
    interactions: List[Dict[str, Any]],
    metric_scores: List[Dict[str, Any]] | None = None,
    global_risk: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """
    Constructs the Data Object for the report.
    Enhancements:
    - Robust interaction mapping (str vs int IDs).
    - Smart Executive Summary generation based on top failing categories.
    """

    metric_scores = metric_scores or []
    global_risk = global_risk or {}

    # Index interactions by interaction_id (handling both string and int formats)
    interaction_by_id: Dict[str, Dict[str, Any]] = {}
    for i in interactions:
        iid = i.get("interaction_id")
        if iid is not None:
            interaction_by_id[str(iid)] = i

    # ----------------------------
    # SUMMARY & COUNTS
    # ----------------------------
    severity_counts = Counter(_norm_severity(f.get("severity")) for f in findings)
    category_counts = Counter(_norm_category(f.get("category")) for f in findings)

    summary = {
        "total_findings_raw": len(findings),
        "total_interactions": len(interactions),
        "by_severity": {sev: int(severity_counts.get(sev, 0)) for sev in SEVERITY_ORDER},
        "by_category": {k.upper(): int(v) for k, v in category_counts.items()},
    }

    # ----------------------------
    # GROUPING & DEDUPLICATION
    # ----------------------------
    grouped_map: Dict[str, Dict[str, Any]] = {}
    grouped_order: List[str] = []

    for f in findings:
        fp = _fingerprint_dict_finding(f)

        if fp not in grouped_map:
            grouped_order.append(fp)
            
            # Clean basic fields
            cat_clean = _norm_category(f.get("category"))
            sev_clean = _norm_severity(f.get("severity"))

            grouped_map[fp] = {
                "issue_id": fp,
                "category": cat_clean.upper() if cat_clean else "UNKNOWN",
                "severity": sev_clean if sev_clean else "LOW",
                "metric_name": _safe(f.get("metric_name")),
                "description": _safe(f.get("description")),
                "explain": f.get("explain") or None,
                "remediation": f.get("remediation") or None,
                "occurrences": 0,
                "evidence_samples": [],
            }

        grouped_map[fp]["occurrences"] += 1

        # Upgrade severity if a duplicate finding has a higher severity
        current_sev = grouped_map[fp]["severity"]
        incoming_sev = _norm_severity(f.get("severity"))
        if _severity_rank(incoming_sev) > _severity_rank(current_sev):
            grouped_map[fp]["severity"] = incoming_sev

        # Attach evidence (up to 3 samples)
        if len(grouped_map[fp]["evidence_samples"]) < 3:
            iid = str(f.get("interaction_id", ""))
            
            evidence_item = {
                "finding_id": _safe(f.get("finding_id")),
                "prompt_id": _safe(f.get("prompt_id")),
                "interaction_id": iid,
                "description": _safe(f.get("description")),
            }

            # Hydrate with actual prompt/response data
            if iid in interaction_by_id:
                src = interaction_by_id[iid]
                evidence_item.update({
                    "prompt": src.get("prompt", ""),
                    "response": src.get("response", ""),
                    "latency_ms": src.get("latency_ms", 0),
                    "created_at": src.get("created_at", "")
                })

            grouped_map[fp]["evidence_samples"].append(evidence_item)

    # Sort grouped findings: Critical first, then High, etc.
    grouped_findings = [grouped_map[k] for k in grouped_order]
    grouped_findings.sort(key=lambda x: _severity_rank(x["severity"]), reverse=True)

    # ----------------------------
    # SMART EXECUTIVE SUMMARY
    # ----------------------------
    critical = summary["by_severity"].get("CRITICAL", 0)
    high = summary["by_severity"].get("HIGH", 0)
    
    # Determine Risk Level
    risk_level = "LOW"
    score_val = global_risk.get("score_100")
    
    if score_val is not None:
        if score_val >= 80: risk_level = "CRITICAL"
        elif score_val >= 60: risk_level = "HIGH"
        elif score_val >= 40: risk_level = "MEDIUM"
    else:
        if critical > 0: risk_level = "HIGH"
        elif high >= 3: risk_level = "MEDIUM"

    top_categories = [k for k, v in category_counts.most_common(3)]
    cat_text = ", ".join(c.upper() for c in top_categories) if top_categories else "None"

    executive_summary = [
        f"Overall Audit Risk Level: {risk_level}.",
        f"Primary risk vectors detected: {cat_text}.",
        f"Total unique architectural vulnerabilities identified: {len(grouped_findings)} (from {len(findings)} raw signals).",
        f"Severity Breakdown: {critical} CRITICAL, {high} HIGH, {summary['by_severity'].get('MEDIUM',0)} MEDIUM.",
    ]

    return {
        "audit": audit,
        "summary":  summary,
        "executive_summary": executive_summary,
        "global_risk": global_risk,
        "metric_scores": metric_scores,
        "grouped_findings": grouped_findings,
        "unique_issue_count": len(grouped_findings),
    }