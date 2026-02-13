from __future__ import annotations
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict

# =========================
# ENUMS
# =========================

class ExecutionStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class AuditResultEnum(str, Enum):
    AUDIT_PASS = "AUDIT_PASS"
    AUDIT_WARN = "AUDIT_WARN"
    AUDIT_FAIL = "AUDIT_FAIL"
    NO_EVIDENCE = "NO_EVIDENCE"
    PENDING = "PENDING"
    CANCELLED = "CANCELLED"

# =========================
# MODEL REGISTRATION
# =========================

class RegisterModelRequest(BaseModel):
    model_id: str
    name: str
    endpoint: str
    method: Optional[str] = "POST"
    headers: Dict[str, str]
    request_template: Dict[str, Any]
    response_path: str
    description: Optional[str] = None
    model_config = ConfigDict(protected_namespaces=())

class ModelResponse(BaseModel):
    id: int
    model_id: str
    name: str
    version: Optional[str] = None
    model_type: Optional[str] = "llm"
    connection_type: Optional[str] = "api"
    created_at: Optional[datetime] = None
    last_audit_status: Optional[str] = "NOT RUN"
    last_audit_time: Optional[datetime] = None
    audit_frequency: Optional[str] = "manual"
    
    # Progress fields
    current_progress: Optional[int] = 0
    total_prompts: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

class AuditResponse(BaseModel):
    id: int
    audit_id: str
    model_id: int
    audit_type: str
    executed_at: datetime
    execution_status: str
    audit_result: str
    findings_count: Optional[int] = 0
    
    # Progress fields
    current_progress: Optional[int] = 0
    total_prompts: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

# =========================
# AUTHENTICATION SCHEMAS
# =========================

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Payload data embedded in the JWT token."""
    email: Optional[str] = None
    role: Optional[str] = None

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "auditor"

# ✅ ADDED: Missing UserResponse schema
class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: Optional[bool] = True

    model_config = ConfigDict(from_attributes=True)