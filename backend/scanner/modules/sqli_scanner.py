import httpx
from typing import List, Dict, Any

SQL_ERROR_PATTERNS = [
    "you have an error in your sql syntax",
    "syntax error at or near",
    "unclosed quotation mark after the character string",
    "sqlite3.operationalerror",
    "pg_query(): query failed",
    "ora-00933: sql command not properly ended",
    "microsoft ole db provider for sql server"
]

SQL_PROBES = [
    "' OR '1'='1",
    "1' ORDER BY 1--",
    "1' UNION SELECT NULL--",
    "admin' --"
]

async def audit_sql_injection(routes: List[str], params: List[str], client: httpx.AsyncClient, scan_id: int) -> List[Dict[str, Any]]:
    findings = []
    
    for route in routes[:8]:
        for param in params[:4]:
            for probe in SQL_PROBES:
                try:
                    # Test via GET Query String
                    res = await client.get(route, params={param: probe}, timeout=5.0)
                    body_lower = res.text.lower()
                    
                    for error_signature in SQL_ERROR_PATTERNS:
                        if error_signature in body_lower:
                            findings.append({
                                "scan_id": scan_id,
                                "title": f"SQL Injection (Error-Based) in '{param}' Parameter",
                                "category": "Injection & Fuzzing",
                                "cwe": "CWE-89",
                                "owasp": "A03:2021-Injection",
                                "cvss": 9.8,
                                "severity": "critical",
                                "status": "open",
                                "endpoint": route,
                                "method": "GET",
                                "curl": f"curl -X GET '{route}?{param}={probe}'",
                                "expected_response": "HTTP 400 Bad Request with sanitized parameters",
                                "actual_response": f"HTTP {res.status_code}\n\n{res.text[:300]}",
                                "business_impact": "Allows attackers to bypass authentication, read sensitive database records, or corrupt tables.",
                                "remediation": "Use parameterized queries / prepared statements (e.g. Prisma, SQLAlchemy, or parameterized SQL) instead of dynamic string concatenation.",
                                "evidence": f"Injected probe '{probe}' into '{param}' triggered database error signature: '{error_signature}'."
                            })
                            return findings  # Return once confirmed critical
                except Exception:
                    continue
    return findings
