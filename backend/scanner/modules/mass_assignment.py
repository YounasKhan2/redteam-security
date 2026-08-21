import httpx
from typing import List, Dict, Any

PRIVILEGED_PAYLOADS = [
    {"is_admin": True, "role": "admin", "admin": True},
    {"tier": "enterprise", "plan": "unlimited", "is_verified": True},
    {"permissions": ["admin", "superadmin", "*"]},
    {"status": "approved", "verified": True}
]

async def audit_mass_assignment(
    target_url: str,
    routes: List[str],
    client: httpx.AsyncClient,
    scan_id: int
) -> List[Dict[str, Any]]:
    """
    Mass Assignment & Privilege Escalation Fuzzer:
    Injects privileged parameter keys into POST/PUT/PATCH endpoints to verify
    whether backend ORMs blindly persist unwhitelisted authorization flags.
    """
    findings = []
    base_url = target_url.rstrip("/")

    candidate_endpoints = list(set([
        f"{base_url}/api/user",
        f"{base_url}/api/profile",
        f"{base_url}/api/users/profile",
        f"{base_url}/api/account"
    ] + [r for r in routes if any(k in r for k in ["user", "profile", "account", "settings", "team"])]))

    for ep in candidate_endpoints[:6]:
        for method in ["PUT", "PATCH", "POST"]:
            for payload in PRIVILEGED_PAYLOADS:
                try:
                    res = await client.request(method, ep, json=payload, timeout=5.0)
                    if res.status_code in [200, 201, 204]:
                        res_text_lower = res.text.lower()
                        # If response body reflects the injected administrative attributes
                        if any(k in res_text_lower for k in ['"is_admin": true', '"role": "admin"', '"admin": true', '"tier": "enterprise"']):
                            findings.append({
                                "scan_id": scan_id,
                                "title": f"Mass Assignment: Privilege Escalation via '{list(payload.keys())[0]}'",
                                "category": "Business Logic & State",
                                "cwe": "CWE-915",
                                "owasp": "API6:2023-Mass Assignment",
                                "cvss": 8.8,
                                "severity": "high",
                                "status": "open",
                                "endpoint": ep,
                                "method": method,
                                "curl": f"curl -X {method} '{ep}' -H 'Content-Type: application/json' -d '{list(payload.keys())[0]}=true'",
                                "expected_response": "HTTP 400 Bad Request / Stripped unknown fields (DTO Whitelisting)",
                                "actual_response": f"HTTP {res.status_code}\n\n{res.text[:300]}",
                                "business_impact": "Regular users can self-elevate permissions to Administrator or Enterprise tier by submitting hidden JSON keys in update requests.",
                                "remediation": "Enforce explicit Data Transfer Object (DTO) schema whitelisting (e.g. Zod, Pydantic, Marshmallow) and never pass raw `req.body` directly to database save methods.",
                                "evidence": f"Endpoint {method} {ep} accepted privileged payload and reflected modified administrative role in response: '{res.text[:150]}...'."
                            })
                            return findings
                except Exception:
                    continue

    return findings
