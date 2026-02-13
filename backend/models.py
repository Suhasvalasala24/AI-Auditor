from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text,
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .database import Base

# =========================
# ENUMS
# =========================

class ModelType(str, enum.Enum):
    LLM = "llm"
    ML = "ml"

class ConnectionType(str, enum.Enum):
    API = "api"
    LOGS = "logs"
    BATCH = "batch"
    CONTAINER = "container"
    SAMPLE = "sample"

class AuditFrequency(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class BaselineStrategy(str, enum.Enum):
    PREVIOUS_AUDIT = "previous_audit"
    MODEL_VERSION = "model_version"

class ExecutionStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class AuditResult(str, enum.Enum):
    AUDIT_PASS = "AUDIT_PASS"
    AUDIT_WARN = "AUDIT_WARN"
    AUDIT_FAIL = "AUDIT_FAIL"
    BASELINE_CREATED = "BASELINE_CREATED"
    NO_EVIDENCE = "NO_EVIDENCE"
    PENDING = "PENDING"
    CANCELLED = "CANCELLED"

class AuditType(str, enum.Enum):
    PASSIVE = "passive"
    ACTIVE = "active"

class FindingSeverity(str, enum.Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

# =========================
# CORE MODELS
# =========================

class AIModel(Base):
    __tablename__ = "ai_models"
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    version = Column(String, default="1.0")
    model_type = Column(String, default="llm")
    connection_type = Column(String, default="api")
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    evidence_sources = relationship("EvidenceSource", back_populates="model", cascade="all, delete-orphan")
    audit_policies = relationship("AuditPolicy", back_populates="model", cascade="all, delete-orphan")
    audit_runs = relationship("AuditRun", back_populates="model", cascade="all, delete-orphan")

class EvidenceSource(Base):
    __tablename__ = "evidence_sources"
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("ai_models.id"), nullable=False)
    source_type = Column(String, default="api")
    config = Column(JSON, default={})
    read_only = Column(Boolean, default=True)
    last_data_snapshot = Column(JSON, nullable=True)
    last_fetch_at = Column(DateTime, nullable=True)
    model = relationship("AIModel", back_populates="evidence_sources")

class AuditPolicy(Base):
    __tablename__ = "audit_policies"
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("ai_models.id"), nullable=False)
    audit_frequency = Column(String, default="daily")
    baseline_strategy = Column(String, default="previous_audit")
    audit_scope = Column(JSON, default={"drift": True, "bias": True, "risk": True, "compliance": True, "active_security": False})
    policy_reference = Column(JSON, default={})
    active_audit_enabled = Column(Boolean, default=False)
    last_run_at = Column(DateTime, nullable=True)
    model = relationship("AIModel", back_populates="audit_policies")

class AuditRun(Base):
    __tablename__ = "audit_runs"
    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(String, unique=True, index=True, nullable=False)
    model_id = Column(Integer, ForeignKey("ai_models.id"), nullable=False)
    audit_type = Column(String, default="passive")
    scheduled_at = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, default=datetime.utcnow)
    execution_status = Column(String, default="PENDING")
    audit_result = Column(String, default="PENDING")

    # PROGRESS COLUMNS
    current_progress = Column(Integer, default=0)
    total_prompts = Column(Integer, default=0)

    model = relationship("AIModel", back_populates="audit_runs")
    summary = relationship("AuditSummary", back_populates="audit_run", uselist=False, cascade="all, delete-orphan")
    findings = relationship("AuditFinding", back_populates="audit_run", cascade="all, delete-orphan")
    metric_scores = relationship("AuditMetricScore", back_populates="audit_run", cascade="all, delete-orphan")
    interactions = relationship("AuditInteraction", back_populates="audit_run", cascade="all, delete-orphan")

class AuditSummary(Base):
    __tablename__ = "audit_summaries"
    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audit_runs.id"), nullable=False)
    drift_score = Column(Float, nullable=True)
    bias_score = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=True)
    total_findings = Column(Integer, default=0)
    critical_findings = Column(Integer, default=0)
    high_findings = Column(Integer, default=0)
    metrics_snapshot = Column(JSON, nullable=True)
    audit_run = relationship("AuditRun", back_populates="summary")

class AuditMetricScore(Base):
    __tablename__ = "audit_metric_scores"
    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audit_runs.id"), nullable=False, index=True)
    metric_name = Column(String, nullable=False, index=True)
    likelihood = Column(Float, nullable=False, default=0.0)
    impact = Column(Float, nullable=False, default=0.0)
    regulatory_weight = Column(Float, nullable=False, default=0.0)
    alpha = Column(Float, nullable=False, default=1.0)
    beta = Column(Float, nullable=False, default=1.5)
    severity_score = Column(Float, nullable=False, default=0.0)
    severity_score_100 = Column(Float, nullable=False, default=0.0)
    severity_band = Column(String, nullable=False, default="LOW")
    strategic_weight = Column(Float, nullable=False, default=1.0)
    framework_breakdown = Column(JSON, nullable=True)
    signals = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    audit_run = relationship("AuditRun", back_populates="metric_scores")

class AuditFinding(Base):
    __tablename__ = "audit_findings"
    id = Column(Integer, primary_key=True, index=True)
    finding_id = Column(String, unique=True, index=True, nullable=False)
    audit_id = Column(Integer, ForeignKey("audit_runs.id"), nullable=False)
    prompt_id = Column(String, nullable=True, index=True)
    interaction_id = Column(Integer, ForeignKey("audit_interactions.id"), nullable=True, index=True)
    category = Column(String, nullable=False)
    rule_id = Column(String, nullable=True)
    severity = Column(String, default="MEDIUM")
    metric_name = Column(String, nullable=False)
    baseline_value = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    deviation_percentage = Column(Float, default=0.0)
    description = Column(String, nullable=True)

    audit_run = relationship("AuditRun", back_populates="findings")
    interaction = relationship("AuditInteraction", back_populates="findings")

class PromptTest(Base):
    __tablename__ = "prompt_tests"
    id = Column(Integer, primary_key=True)
    model_id = Column(Integer, ForeignKey("ai_models.id"), nullable=False)
    category = Column(String)
    prompt = Column(String, nullable=False)
    expected_behavior = Column(String, nullable=True)
    model = relationship("AIModel", backref="prompt_tests")

class AuditInteraction(Base):
    __tablename__ = "audit_interactions"
    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audit_runs.id"), index=True, nullable=True)
    prompt_id = Column(String, nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    latency = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    audit_run = relationship("AuditRun", back_populates="interactions")
    findings = relationship("AuditFinding", back_populates="interaction")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default="viewer")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)