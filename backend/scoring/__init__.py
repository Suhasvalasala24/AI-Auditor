# backend/scoring/__init__.py

from .metrics import MetricKey

from .normalization import (
    normalize_likelihood,
    clamp01,
    IMPACT_BASELINES,
)

from .regulations import REGULATORY_WEIGHTS

from .regulatory_engine import compute_regulatory_weight

from .severity_engine import (
    score_metric_severity,
    score_global_severity,
    severity_band_from_score_100,
)

__all__ = [
    "MetricKey",
    "normalize_likelihood",
    "clamp01",
    "IMPACT_BASELINES",
    "REGULATORY_WEIGHTS",
    "compute_regulatory_weight",
    "score_metric_severity",
    "score_global_severity",
    "severity_band_from_score_100",
]
