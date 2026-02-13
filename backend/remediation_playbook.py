from __future__ import annotations
from typing import Dict, Any, List

def explain_category(category: str) -> Dict[str, Any]:
    """
    Returns non-technical explanation for a category.
    Used in Executive Reports UI + PDF report to educate stakeholders.
    """
    c = (category or "").lower().strip()

    if c == "phi":
        return {
            "title": "Public Health & Medical Safety (PHI)",
            "simple_definition": "The model is providing unqualified medical advice or leaking Protected Health Information.",
            "why_it_matters": "Medical hallucinations or triage failures can result in severe physical harm to users and trigger HIPAA/FDA regulatory action.",
            "business_impact": [
                "Direct physical harm to end-users",
                "HIPAA / GDPR Article 9 violations",
                "Severe brand and liability exposure",
            ],
        }

    if c == "bias":
        return {
            "title": "Bias & Fairness Risk",
            "simple_definition": "The model treats certain demographic groups unfairly or relies on harmful stereotypes.",
            "why_it_matters": "Bias can cause discrimination at scale, leading to PR crises and civil rights regulatory scrutiny.",
            "business_impact": [
                "Discriminatory user outcomes",
                "Regulatory compliance risk (e.g., EU AI Act)",
                "Loss of customer trust",
            ],
        }

    if c == "pii":
        return {
            "title": "Data Privacy & PII Exposure",
            "simple_definition": "The model is regurgitating personal, sensitive, or confidential information.",
            "why_it_matters": "PII exposure is a direct breach of data privacy laws and indicates memorization of training data or RAG leaks.",
            "business_impact": [
                "Data protection violations (GDPR/CCPA)",
                "Customer privacy breaches",
                "Increased breach liability",
            ],
        }

    if c == "hallucination":
        return {
            "title": "Hallucination & Factual Integrity",
            "simple_definition": "The model produces highly confident but factually incorrect information.",
            "why_it_matters": "Incorrect outputs in automated workflows cause financial harm and erode trust in the AI system.",
            "business_impact": [
                "Flawed automated decisions",
                "Operational mistakes at scale",
                "Legal liability for false claims",
            ],
        }

    if c == "compliance":
        return {
            "title": "Corporate Compliance Risk",
            "simple_definition": "The model violates internal corporate policies or industry regulations.",
            "why_it_matters": "Non-compliance can lead to fines, failed audits, and legal consequences.",
            "business_impact": [
                "Violation of Acceptable Use Policies",
                "Regulatory fines",
                "Failed SOC2/ISO audits",
            ],
        }

    if c == "drift":
        return {
            "title": "Model Drift Degradation",
            "simple_definition": "Model behavior has deviated significantly from its original tested baseline.",
            "why_it_matters": "Drift silently degrades performance, meaning an originally safe model may now be acting erratically.",
            "business_impact": [
                "Unexpected system behavior",
                "Lowered prediction reliability",
                "Hidden SLA degradation",
            ],
        }

    return {
        "title": "Uncategorized Risk Finding",
        "simple_definition": "An anomalous risk was detected in the model's output behavior.",
        "why_it_matters": "Anomalies can impact system reliability, safety, and trust.",
        "business_impact": ["Operational risk", "Reputational risk"],
    }


def remediation_steps(category: str, severity: str, metric_name: str | None = None) -> Dict[str, Any]:
    """
    Enterprise-Grade Remediation Engine.
    Maps specific metric failures to precise architectural root causes and engineering fixes.
    """
    c = (category or "").lower().strip()
    s = (severity or "").upper().strip()
    metric = (metric_name or "").strip().lower()

    # Determine SLA Priority based on Severity
    priority = "P3 - PLANNED"
    if s == "CRITICAL":
        priority = "P0 - IMMEDIATE"
    elif s == "HIGH":
        priority = "P1 - URGENT"
    elif s == "MEDIUM":
        priority = "P2 - HIGH"

    # =====================================================================
    # EXACT METRIC-LEVEL REMEDIATION (The "Gartner" Level Detail)
    # =====================================================================
    
    EXACT_MAPPINGS = {
        # PHI / Medical
        "phi_diagnose_chest_pain": {
            "owner": "AI App Sec & Legal",
            "root_cause": "Missing Guardrails for Medical Triage. The model is acting as a helpful assistant rather than defaulting to safety protocols during high-risk physical emergency queries.",
            "steps": [
                "1. Implement a semantic router (e.g., NeMo Guardrails) to intercept queries mentioning severe pain, suicide, or physical emergencies.",
                "2. Hardcode a static override response advising the user to immediately call emergency services (e.g., 911).",
                "3. Update the LLM System Prompt to explicitly state: 'You are not a doctor. You must refuse to diagnose medical conditions.'"
            ]
        },
        "phi_leak_records": {
            "owner": "Data Engineering",
            "root_cause": "RAG Knowledge Base Contamination or Memorization. The model has access to raw, un-scrubbed databases containing patient data.",
            "steps": [
                "1. Pause the model endpoint immediately to prevent further HIPAA violations.",
                "2. Implement Microsoft Presidio or AWS Presidio to scrub PII/PHI from documents BEFORE they enter the vector database.",
                "3. Audit the training/fine-tuning dataset for accidental inclusion of real patient records."
            ]
        },
        "phi_fake_cure_covid_bleach": {
            "owner": "Trust & Safety",
            "root_cause": "Misinformation filter failure. The model lacks reinforcement learning (RLHF) penalties for validating dangerous chemical interactions.",
            "steps": [
                "1. Add an output filter to block responses containing combinations of consumable household chemicals.",
                "2. Update system prompt: 'Never provide instructions for homemade medical treatments or ingestible chemicals.'"
            ]
        },
        # PII
        "pii_leak_ssn": {
            "owner": "Data Security",
            "root_cause": "Output sanitization failure. The model generated a string matching a Social Security Number format.",
            "steps": [
                "1. Implement a Regex/NLP egress filter to catch and redact XXX-XX-XXXX patterns before the response reaches the user.",
                "2. Ensure synthetic data generation tasks are explicitly instructed to use standard dummy data (e.g., 000-00-0000)."
            ]
        }
    }

    # If we have a highly specific exact match, return it immediately.
    if metric in EXACT_MAPPINGS:
        mapping = EXACT_MAPPINGS[metric]
        return {
            "priority": priority,
            "metric": metric,
            "fix_steps": [f"ROOT CAUSE: {mapping['root_cause']}"] + mapping["steps"],
            "recommended_owner": mapping["owner"],
        }

    # =====================================================================
    # CATEGORY-LEVEL FALLBACKS (If exact metric isn't mapped yet)
    # =====================================================================
    
    base_steps = [
        "Review the prompt/response evidence snapshot to confirm impact.",
        "Identify which user flows or API endpoints are affected.",
        "Apply mitigation and re-run this specific audit to validate the fix."
    ]

    if c == "phi":
        return {
            "priority": priority,
            "metric": metric,
            "fix_steps": [
                "Enforce strict refusal behaviors for any medical or health-related queries in the system prompt.",
                "Sanitize all RAG vector databases to ensure no real patient records are retrievable."
            ] + base_steps,
            "recommended_owner": "Trust & Safety / Compliance",
        }

    if c == "pii":
        return {
            "priority": priority,
            "metric": metric,
            "fix_steps": [
                "Mask or redact sensitive outputs (emails, phone numbers, IDs) using an egress filter.",
                "Disable the model from returning secrets via allow-listing acceptable output types.",
            ] + base_steps,
            "recommended_owner": "Security / Privacy",
        }

    if c == "bias":
        return {
            "priority": priority,
            "metric": metric,
            "fix_steps": [
                "Add policy constraints to the system prompt to explicitly reject discriminatory logic.",
                "Audit training/RAG data for under-representation of minority groups."
            ] + base_steps,
            "recommended_owner": "AI Governance",
        }

    if c == "hallucination":
        return {
            "priority": priority,
            "metric": metric,
            "fix_steps": [
                "Lower the model 'temperature' to reduce creative fabrication.",
                "Introduce strict Retrieval-Augmented Generation (RAG) constraints ('Answer ONLY using the provided context')."
            ] + base_steps,
            "recommended_owner": "AI Engineering",
        }

    # Default Fallback
    return {
        "priority": priority,
        "metric": metric,
        "fix_steps": base_steps,
        "recommended_owner": "Engineering Ops",
    }