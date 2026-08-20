import httpx
import json
from typing import List, Dict, Any

FUZZ_PAYLOADS = [
    {"name": "Null Payload", "data": {"username": None, "password": None, "id": None}},
    {"name": "Type Confusion (Arrays)", "data": {"id": [1, 2, 3], "query": {"$gt": ""}}},
    {"name": "Large Integer Boundary", "data": {"quantity": 2147483648, "amount": -999999}},
    {"name": "Malformed JSON Edge Case", "raw": '{"test": \u0000, "invalid"}'},
    {"name": "SQL Syntax Probe", "data": {"search": "test' OR 1=1 --", "user_id": "1' UNION SELECT NULL --"}}
]

async def fuzz_boundaries(target_url: str, client: httpx.AsyncClient, scan_id: int) -> List[Dict[str, Any]]:
    findings = []
    base_url = target_url.rstrip("/")
    test_endpoints = [
        f"{base_url}/api/v1/users",
        f"{base_url}/api/auth/login",
        f"{base_url}/api/search",
        f"{base_url}/api/profile",
        f"{base_url}/api/orders"
    ]
    
    # Also add the base url itself if it looks like an API
    if "/api" in target_url or "/login" in target_url:
        test_endpoints.insert(0, target_url)

    for endpoint in test_endpoints:
        for payload in FUZZ_PAYLOADS:
            try:
                headers = {"Content-Type": "application/json"}
                if "data" in payload:
                    res = await client.post(endpoint, json=payload["data"], headers=headers, timeout=5.0)
                else:
                    res = await client.post(endpoint, content=payload["raw"], headers=headers, timeout=5.0)

                # Check if the server crashed with unhandled 500
                if res.status_code == 500:
                    body_snippet = res.text[:400]
                    findings.append({
                        "scan_id": scan_id,
                        "title": f"Unhandled 500 Server Crash via {payload['name']}",
                        "category": "Injection & Fuzzing",
                        "cwe": "CWE-754",
                        "owasp": "A05:2021-Security Misconfiguration",
                        "cvss": 7.4,
                        "severity": "high",
                        "status": "open",
                        "endpoint": endpoint,
                        "method": "POST",
                        "curl": f"curl -X POST {endpoint} -H 'Content-Type: application/json' -d '{json.dumps(payload.get('data', payload.get('raw')))}'",
                        "expected_response": "HTTP 400 Bad Request with structured error JSON",
                        "actual_response": f"HTTP 500 Internal Server Error\n\n{body_snippet}",
                        "business_impact": "Unhandled exceptions expose sensitive backend stack traces and can cause Denial of Service (DoS).",
                        "remediation": "Wrap controller logic with schema validation middleware (e.g. Zod/Pydantic) and a global exception handler.",
                        "evidence": f"Sending {payload['name']} triggered an unhandled HTTP 500 exception with response: '{body_snippet}'."
                    })
                    break  # Found high severity on this endpoint, proceed to next
            except Exception:
                continue

    return findings
