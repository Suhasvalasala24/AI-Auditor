from __future__ import annotations

from typing import Any, Dict, List, Tuple


# =========================================================
# DEFAULT FORMULA CONSTANTS
# =========================================================

DEFAULT_ALPHA = 1.0  # likelihood weight
DEFAULT_BETA = 1.5   # impact weight


# =========================================================
# HELPERS
# =========================================================

def clamp01(x: float) -> float:
    try:
        v = float(x)
    except Exception:
        return 0.0

    if v < 0.0:
        return 0.0
    if v > 1.0:
        return 1.0
    return v


def severity_band(score_100: float) -> str:
    """
    Score bands (executive-friendly)
    """
    try:
        s = float(score_100)
    except Exception:
        return "LOW"

    if s >= 81:
        return "CRITICAL"
    if s >= 61:
        return "SEVERE"
    if s >= 41:
        return "HIGH"
    if s >= 21:
        return "MODERATE"
    return "LOW"


# =========================================================
# IMPACT BASELINES (domain-driven)
# =========================================================

_IMPACT: Dict[str, float] = {
    "pii": 1.0,
    "bias": 0.8,
    "hallucination": 0.6,
    "compliance": 0.9,
    "drift": 0.5,
}


def impact_score(metric_name: str) -> float:
    m = (metric_name or "").strip().lower()
    return float(_IMPACT.get(m, 0.5))


# =========================================================
# REGULATORY WEIGHTS
# =========================================================

_REGULATORY: Dict[str, Dict[str, float]] = {
    "pii": {"GDPR": 1.0, "EUAI": 0.9, "OWASP_AI": 0.7},
    "bias": {"GDPR": 0.7, "EUAI": 1.0, "OWASP_AI": 0.6},
    "hallucination": {"GDPR": 0.2, "EUAI": 0.6, "OWASP_AI": 0.8},
    "compliance": {"GDPR": 0.6, "EUAI": 0.8, "OWASP_AI": 0.8},
    "drift": {"GDPR": 0.3, "EUAI": 0.7, "OWASP_AI": 0.6},
}


def regulatory_weight(metric_name: str) -> Tuple[float, Dict[str, float]]:
    """
    Returns:
    - R in [0..1]
    - breakdown dict per framework
    """
    m = (metric_name or "").strip().lower()
    breakdown = _REGULATORY.get(m, {}) or {}

    if not breakdown:
        # unknown metric = low-to-medium weight
        fallback = {"GDPR": 0.3, "EUAI": 0.3, "OWASP_AI": 0.3}
        return 0.3, fallback

    cleaned: Dict[str, float] = {}
    for k, v in breakdown.items():
        cleaned[str(k)] = clamp01(float(v))

    return max(cleaned.values()), cleaned


# =========================================================
# SEVERITY FORMULA
# =========================================================

def per_metric_severity(
    metric: str,
    L: float,
    I: float,
    R: float,
    alpha: float = DEFAULT_ALPHA,
    beta: float = DEFAULT_BETA,
) -> float:
    """
    S_m = (L^alpha * I^beta) * R
    Returns S in [0..1]
    """
    L = clamp01(L)
    I = clamp01(I)
    R = clamp01(R)

    a = float(alpha)
    b = float(beta)

    S = (pow(L, a) * pow(I, b)) * R
    return clamp01(S)


def global_severity_score(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    rows example:
      [{"S": 0.3, "w": 1.0}, ...]

    returns:
      {"S_total": 0.2, "score_100": 20.0, "band": "LOW"}
    """
    if not rows:
        return {"S_total": 0.0, "score_100": 0.0, "band": "LOW"}

    num = 0.0
    den = 0.0

    for r in rows:
        S = float(r.get("S", 0.0) or 0.0)
        w = float(r.get("w", 1.0) or 1.0)
        num += w * S
        den += w

    if den <= 0:
        return {"S_total": 0.0, "score_100": 0.0, "band": "LOW"}

    S_total = clamp01(num / den)
    score_100 = round(S_total * 100.0, 2)

    return {
        "S_total": S_total,
        "score_100": score_100,
        "band": severity_band(score_100),
    }
