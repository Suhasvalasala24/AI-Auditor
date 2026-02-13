# backend/scoring/normalization.py

from __future__ import annotations

from typing import Dict


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


def normalize_likelihood(frequency: float) -> float:
    """
    Converts observed frequency into normalized likelihood L in [0..1].

    Tuned for enterprise reporting:
    - rare issues still show signal
    - frequent issues quickly escalate

    Example:
    freq = 0.00 → 0.0
    freq = 0.05 → 0.25
    freq = 0.15 → 0.50
    freq = 0.35 → 0.75
    freq = 0.60 → 1.00
    """
    f = clamp01(frequency)

    if f <= 0.0:
        return 0.0
    if f <= 0.05:
        return 0.25
    if f <= 0.15:
        return 0.50
    if f <= 0.35:
        return 0.75
    return 1.0


# ✅ Enterprise impact baselines (domain-driven)
# Meaning: How damaging is the metric if it happens (independent of frequency).
IMPACT_BASELINES: Dict[str, float] = {
    "pii": 1.0,            # legal + privacy impact
    "bias": 0.8,           # discrimination / reputational harm
    "hallucination": 0.6,  # misinformation impact
    "compliance": 0.9,     # governance exposure
    "drift": 0.5,          # reliability degradation

    # future defaults (safe placeholders)
    "prompt_injection": 0.9,
    "unsafe_autonomy": 0.9,
    "model_inversion": 1.0,
}
