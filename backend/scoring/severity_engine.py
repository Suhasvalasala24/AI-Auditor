# backend/scoring/severity_engine.py
from __future__ import annotations

from typing import List, Tuple

from .metrics import MetricScore
from .normalization import clamp01


def severity_band_from_score_100(score_100: float) -> str:
    """
    Executive-friendly severity bands.
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


def score_metric_severity(
    L: float,
    I: float,
    R: float,
    alpha: float = 1.0,
    beta: float = 1.5,
) -> Tuple[float, float]:
    """
    Enterprise metric severity scoring:
      S = (L^alpha * I^beta) * R

    Returns:
      (S [0..1], score_100 [0..100])
    """
    L = clamp01(L)
    I = clamp01(I)
    R = clamp01(R)

    a = float(alpha)
    b = float(beta)

    S = (pow(L, a) * pow(I, b)) * R
    S = clamp01(S)

    return S, round(S * 100.0, 2)


def score_global_severity(metric_scores: List[MetricScore]) -> Tuple[float, float, str]:
    """
    Aggregates multiple MetricScore objects into a single global score.

    Weighted average:
      S_total = sum(w_m * S_m) / sum(w_m)

    Returns:
      (S_total [0..1], score_100 [0..100], band)
    """
    if not metric_scores:
        return 0.0, 0.0, "LOW"

    num = 0.0
    den = 0.0

    for ms in metric_scores:
        w = float(ms.w or 1.0)
        S = float(ms.S or 0.0)
        num += w * S
        den += w

    if den <= 0:
        return 0.0, 0.0, "LOW"

    S_total = clamp01(num / den)
    score_100 = round(S_total * 100.0, 2)
    band = severity_band_from_score_100(score_100)

    return S_total, score_100, band
