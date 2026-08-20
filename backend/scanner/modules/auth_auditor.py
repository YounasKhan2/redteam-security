import httpx
from typing import List, Dict, Any

async def audit_auth_and_access(target_url: str, client: httpx.AsyncClient, scan_id: int) -> List[Dict[str, Any]]:
    findings = []
    base_url = target_url.rstrip("/")
    
    # Check endpoints that are typically protected
    protected_candidates = [
        f"{base_url}/api/user",
        f"{base_url}/api/profile",
        f"{base_url}/api/v1/orders",
        f"{base_url}/api/admin/users",
        f"{base_url}/api/settings"
    ]
    
    for ep in protected_candidates:
        try:
            # 1. Test unauthenticated request
            res = await client.get(ep, timeout=5.0)
            if res.status_code == 200 and len(res.text) > 10:
                findings.append({
                    "scan_id": scan_id,
                    "title": f"Missing Authentication Check on Protected Endpoint",
                    "category": "Authentication & Authorization",
                    "cwe": "CWE-306",
                    "owasp": "A01:2021-Broken Access Control",
                    "cvss": 9.1,
                    "severity": "critical",
                    "status": "open",
                    "endpoint": ep,
                    "method": "GET",
                    "curl": f"curl -X GET {ep}",
                    "expected_response": "HTTP 401 Unauthorized / HTTP 403 Forbidden",
                    "actual_response": f"HTTP 200 OK\n\n{res.text[:300]}",
                    "business_impact": "Unauthenticated attackers can read or tamper with private customer data or administrative settings.",
                    "remediation": "Enforce authentication middleware (e.g. verify JWT / session cookie) before processing requests to this route.",
                    "evidence": f"Endpoint {ep} returned status 200 OK and data payload without requiring any Authorization header."
                })
                
            # 2. Test forged/tampered token
            tampered_res = await client.get(ep, headers={"Authorization": "Bearer forged_invalid_jwt_token_12345"}, timeout=5.0)
            if tampered_res.status_code == 200 and len(tampered_res.text) > 10:
                findings.append({
                    "scan_id": scan_id,
                    "title": f"Improper JWT Signature Verification on {ep}",
                    "category": "Authentication & Authorization",
                    "cwe": "CWE-347",
                    "owasp": "A07:2021-Identification and Authentication Failures",
                    "cvss": 9.8,
                    "severity": "critical",
                    "status": "open",
                    "endpoint": ep,
                    "method": "GET",
                    "curl": f"curl -X GET {ep} -H 'Authorization: Bearer forged_invalid_jwt_token_12345'",
                    "expected_response": "HTTP 401 Unauthorized (Invalid Token Signature)",
                    "actual_response": f"HTTP 200 OK\n\n{tampered_res.text[:300]}",
                    "business_impact": "Attackers can forge arbitrary identity tokens to impersonate any user or administrator.",
                    "remediation": "Enforce cryptographic verification of JWT signatures using verified public keys / HMAC secrets.",
                    "evidence": f"Endpoint accepted forged JWT token and returned HTTP 200 OK."
                })
        except Exception:
            continue
            
    return findings
