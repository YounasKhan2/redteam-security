import httpx
import asyncio
from typing import List, Dict, Any

async def audit_rate_limiting(target_url: str, client: httpx.AsyncClient, scan_id: int) -> List[Dict[str, Any]]:
    findings = []
    base_url = target_url.rstrip("/")
    login_endpoints = [
        f"{base_url}/api/auth/login",
        f"{base_url}/api/login",
        f"{base_url}/login"
    ]
    
    if "/login" in target_url:
        login_endpoints.insert(0, target_url)
        
    for ep in login_endpoints:
        try:
            # Send burst of 15 rapid requests in 1 second
            reqs = [client.post(ep, json={"username": f"test_{i}", "password": "wrongpassword"}, timeout=4.0) for i in range(15)]
            responses = await asyncio.gather(*reqs, return_exceptions=True)
            
            valid_responses = [r for r in responses if isinstance(r, httpx.Response)]
            if not valid_responses:
                continue
                
            status_codes = [r.status_code for r in valid_responses]
            has_rate_limit = any(code == 429 for code in status_codes)
            
            # If all 15 requests passed without any 429 or rate-limit header
            if not has_rate_limit and len(valid_responses) >= 12:
                findings.append({
                    "scan_id": scan_id,
                    "title": "Missing Rate Limiting on Authentication Endpoint",
                    "category": "Rate Limiting & Exhaustion",
                    "cwe": "CWE-799",
                    "owasp": "A04:2021-Insecure Design",
                    "cvss": 7.5,
                    "severity": "high",
                    "status": "open",
                    "endpoint": ep,
                    "method": "POST",
                    "curl": f"for i in {{1..20}}; do curl -X POST {ep} -d '{{\"username\":\"admin\"}}'; done",
                    "expected_response": "HTTP 429 Too Many Requests after 5-10 failed attempts",
                    "actual_response": f"All 15 rapid requests returned HTTP {status_codes[0]} without rate limit throttling",
                    "business_impact": "Enables automated brute-force attacks and credential stuffing against user and admin accounts.",
                    "remediation": "Implement rate limiting middleware (e.g. Redis token bucket or Cloudflare Rate Limiting) limiting login attempts to <= 5 per minute per IP.",
                    "evidence": f"15 consecutive POST requests to {ep} within 1 second all succeeded without receiving HTTP 429."
                })
                break
        except Exception:
            continue
            
    return findings
