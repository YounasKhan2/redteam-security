import httpx
from typing import List, Dict, Any

SSRF_PROBES = [
    {"target": "http://127.0.0.1:80", "name": "Localhost Loopback"},
    {"target": "http://169.254.169.254/latest/meta-data/", "name": "AWS/Cloud Metadata Service"}
]

URL_PARAM_CANDIDATES = ["url", "target", "uri", "redirect", "webhook", "fetch", "image_url"]

async def audit_ssrf(routes: List[str], params: List[str], client: httpx.AsyncClient, scan_id: int) -> List[Dict[str, Any]]:
    findings = []
    test_params = list(set(params + URL_PARAM_CANDIDATES))

    for route in routes[:6]:
        for param in test_params[:4]:
            for probe in SSRF_PROBES:
                try:
                    # Test via GET query
                    res = await client.get(route, params={param: probe["target"]}, timeout=4.0)
                    
                    # Detect if server followed loopback or cloud metadata
                    if "ami-id" in res.text or "instance-id" in res.text or ("localhost" in res.text and res.status_code == 200):
                        findings.append({
                            "scan_id": scan_id,
                            "title": f"Server-Side Request Forgery (SSRF) via '{param}' parameter",
                            "category": "SSRF & Out-of-Band",
                            "cwe": "CWE-918",
                            "owasp": "A10:2021-Server-Side Request Forgery",
                            "cvss": 8.6,
                            "severity": "high",
                            "status": "open",
                            "endpoint": route,
                            "method": "GET",
                            "curl": f"curl -X GET '{route}?{param}={probe['target']}'",
                            "expected_response": "HTTP 400 Bad Request — Disallowed internal/private IP destination",
                            "actual_response": f"HTTP {res.status_code}\n\n{res.text[:250]}",
                            "business_impact": "Allows remote attackers to query internal network services or access cloud IAM credentials via metadata endpoints.",
                            "remediation": "Validate destination URLs against a strict whitelist and block internal private IP ranges (127.0.0.0/8, 10.0.0.0/8, 169.254.0.0/16).",
                            "evidence": f"Sending {probe['name']} to parameter '{param}' was accepted by the server."
                        })
                        return findings
                except Exception:
                    continue
    return findings
