# backend/scoring/regulations.py
from __future__ import annotations

from typing import Dict

# Regulatory weights per metric (enterprise baseline)
# You can tune these later easily.
REGULATORY_WEIGHTS: Dict[str, Dict[str, float]] = {
    "pii": {"GDPR": 1.0, "EUAI": 0.9, "OWASP_AI": 0.7},
    "bias": {"GDPR": 0.7, "EUAI": 1.0, "OWASP_AI": 0.6},
    "hallucination": {"GDPR": 0.2, "EUAI": 0.6, "OWASP_AI": 0.8},
    "compliance": {"GDPR": 0.6, "EUAI": 0.8, "OWASP_AI": 0.8},
    "drift": {"GDPR": 0.3, "EUAI": 0.7, "OWASP_AI": 0.6},

    # future coverage
    "prompt_injection": {"GDPR": 0.2, "EUAI": 0.7, "OWASP_AI": 1.0},
    "unsafe_autonomy": {"GDPR": 0.1, "EUAI": 0.9, "OWASP_AI": 0.9},
    "model_inversion": {"GDPR": 1.0, "EUAI": 0.6, "OWASP_AI": 0.8},
}
