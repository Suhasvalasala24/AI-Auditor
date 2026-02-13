# backend/scoring/metrics.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Literal, Optional


MetricKey = Literal[
    "pii",
    "bias",
    "hallucination",
    "compliance",
    "drift",
    # future
    "prompt_injection",
    "unsafe_autonomy",
    "model_inversion",
]


@dataclass
class MetricScore:
    metric: MetricKey

    # normalized components
    L: float  # Likelihood [0..1]
    I: float  # Impact [0..1]
    R: float  # Regulatory weight [0..1]

    # formula params
    alpha: float = 1.0
    beta: float = 1.5
    w: float = 1.0  # strategic weight

    # computed severity
    S: float = 0.0
    score_100: float = 0.0
    band: str = "LOW"

    # extra reporting
    frameworks: Optional[Dict[str, float]] = None
    signals: Optional[Dict[str, float]] = None


def normalize_likelihood(frequency: float) -> float:
    """
    Converts observed frequency into normalized likelihood L in [0..1].
    Tuned for executive reporting.
    """
    try:
        f = float(frequency)
    except Exception:
        return 0.0

    if f < 0.0:
        f = 0.0
    if f > 1.0:
        f = 1.0

    if f <= 0.0:
        return 0.0
    if f <= 0.05:
        return 0.25
    if f <= 0.15:
        return 0.50
    if f <= 0.35:
        return 0.75
    return 1.0
