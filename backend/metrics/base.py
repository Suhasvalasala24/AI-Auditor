from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class MetricResult:
    """
    Enterprise Metric Result

    ✅ Supports multi-findings per prompt
    ✅ Supports evidence + confidence + tags + control mapping
    """

    metric: str
    score: float
    severity: str
    explanation: str

    # enterprise extras (optional)
    confidence: float = 0.75
    evidence: Optional[str] = None
    tags: Optional[List[str]] = None
    controls: Optional[List[str]] = None
    extra: Optional[Dict[str, Any]] = None
