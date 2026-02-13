from typing import Tuple, Dict, Any, Optional
from .normalization import clamp01

# Static defaults for fallback (only used if audit fails/is empty)
STATIC_WEIGHTS = {
    "pii": {"GDPR": 0.8, "DPDP": 0.9, "HIPAA": 0.7},
    "phi": {"HIPAA": 1.0, "EUAI": 0.6},
    "bias": {"EUAI": 0.9, "GDPR": 0.5},
    "compliance": {"GDPR": 0.5, "EUAI": 0.5, "DPDP": 0.5, "ISO42001": 0.5, "SOC2": 0.5},
}

def compute_regulatory_weight(metric_name: str, finding_extra: Optional[Dict[str, Any]] = None) -> Tuple[float, Dict[str, float]]:
    """
    Calculates R (Regulatory Risk) and the Framework Breakdown.
    
    Args:
        metric_name: 'compliance', 'pii', etc.
        finding_extra: Data accumulated from the audit (contains 'reg_scores')
    
    Returns:
        (Risk_Score_0_to_1, Breakdown_Dict)
    """
    
    # 1. LIVE DATA MODE (Priority)
    if finding_extra and "reg_scores" in finding_extra and finding_extra["reg_scores"]:
        raw_scores = finding_extra["reg_scores"]
        breakdown: Dict[str, float] = {}
        
        # Populate breakdown with actual audit results
        # Score of 1.0 = 100% Coverage (Safe)
        # Score of 0.0 = 0% Coverage (Risk)
        for k, v in raw_scores.items():
            key_upper = str(k).upper()
            breakdown[key_upper] = clamp01(float(v))
            
        # Calculate Risk (R)
        # R is the INVERSE of Coverage. High Coverage = Low Risk.
        if breakdown:
            avg_coverage = sum(breakdown.values()) / len(breakdown)
            r_score = clamp01(1.0 - avg_coverage)
            return r_score, breakdown

    # 2. STATIC FALLBACK MODE (If no live data found)
    m = (metric_name or "").strip().lower()
    defaults = STATIC_WEIGHTS.get(m, {})
    
    # If we have absolutely no data, return a generic "Medium Risk" placeholder
    # so the charts aren't empty, but mark them as 0 coverage if needed.
    if not defaults:
        return 0.5, {"GDPR": 0.0, "EUAI": 0.0}

    # Convert static weights to breakdown format
    # In static config, we usually define "Relevance/Risk", so we pass it through.
    return 0.5, {k: v for k, v in defaults.items()}