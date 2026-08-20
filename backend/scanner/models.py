from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class ScanRequest(BaseModel):
    name: str = "Staging API Red-Team Sweep"
    target_url: str
    spec_type: str = "generic_url"
    environment: str = "staging"
    modules: List[str] = Field(default_factory=lambda: ["p-auth", "p-rate", "p-inject", "p-logic", "p-ssrf", "p-bola"])
    auth_headers: Optional[Dict[str, str]] = None
    tenant_b_auth_headers: Optional[Dict[str, str]] = None

class FindingCreate(BaseModel):
    scan_id: int
    title: str
    category: str
    cwe: str
    owasp: str
    cvss: float
    severity: str  # critical, high, medium, low
    status: str = "open"
    endpoint: str
    method: str
    curl: str
    expected_response: str
    actual_response: str
    business_impact: str
    remediation: str
    evidence: str

class ScanEventCreate(BaseModel):
    scan_id: int
    phase_key: Optional[str] = None
    level: str  # INFO, AI, EXEC, VERIFY, GATE, CRITICAL, HIGH, MEDIUM, LOW
    message: str
    ts: Optional[str] = None
