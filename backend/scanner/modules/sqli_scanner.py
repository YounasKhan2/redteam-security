import time
import httpx
from typing import List, Dict, Any

SQL_ERROR_PATTERNS = [
    "you have an error in your sql syntax",
    "syntax error at or near",
    "unclosed quotation mark after the character string",
    "sqlite3.operationalerror",
    "pg_query(): query failed",
    "ora-00933: sql command not properly ended",
    "microsoft ole db provider for sql server",
    "driver][sql server]",
    "check the manual that corresponds to your mysql server version",
    "quoted string not properly terminated",
    "org.hibernate.exception.sqlgrammarexception"
]

SYNTAX_PROBES = [
    "' OR '1'='1",
    "1' ORDER BY 1--",
    "1' UNION SELECT NULL--",
    "admin' --",
    "\" OR \"1\"=\"1"
]

# Time-based delay probes (3-second delays)
TIME_PROBES = [
    ("MySQL/PostgreSQL", "1' OR (SELECT 1 FROM (SELECT SLEEP(3))a)-- ", 3.0),
    ("PostgreSQL", "1' OR pg_sleep(3)--", 3.0),
    ("MSSQL", "1'; WAITFOR DELAY '0:0:3'--", 3.0),
    ("SQLite", "1' AND (SELECT 1 FROM (SELECT count(*),concat((SELECT(SELECT concat('a'))),floor(rand(0)*2))x FROM information_schema.tables GROUP BY x)a)--", 3.0)
]

async def audit_sql_injection(routes: List[str], params: List[str], client: httpx.AsyncClient, scan_id: int) -> List[Dict[str, Any]]:
    """
    Advanced SQL Injection Auditor:
    1. Error-Based SQLi (GET params & POST JSON bodies)
    2. Time-Based Blind SQLi (Differential round-trip latency analysis)
    """
    findings = []
    
    candidate_params = list(set(params + ["search", "query", "id", "user_id", "email", "filter", "category"]))

    for route in routes[:10]:
        # 1. Capture baseline latency for this route
        baseline_time = 0.1
        try:
            t0 = time.perf_counter()
            base_res = await client.get(route, timeout=5.0)
            baseline_time = time.perf_counter() - t0
        except Exception:
            pass

        # 2. Test Error-Based SQLi across parameters
        for param in candidate_params[:6]:
            for probe in SYNTAX_PROBES:
                # Test A: GET Query Parameter
                try:
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
                                "business_impact": "Allows attackers to bypass authentication, read sensitive database tables, or corrupt records.",
                                "remediation": "Use parameterized queries / prepared statements (e.g. Prisma, SQLAlchemy, or parameterized SQL) instead of dynamic string concatenation.",
                                "evidence": f"Injected probe '{probe}' into query param '{param}' triggered database error: '{error_signature}'."
                            })
                            return findings
                except Exception:
                    pass

                # Test B: POST JSON Body Parameter (for APIs)
                if route.startswith("http") and ("/api/" in route or "search" in route or "login" in route):
                    try:
                        res = await client.post(route, json={param: probe}, timeout=5.0)
                        body_lower = res.text.lower()
                        for error_signature in SQL_ERROR_PATTERNS:
                            if error_signature in body_lower:
                                findings.append({
                                    "scan_id": scan_id,
                                    "title": f"SQL Injection (Error-Based JSON Body) in '{param}'",
                                    "category": "Injection & Fuzzing",
                                    "cwe": "CWE-89",
                                    "owasp": "A03:2021-Injection",
                                    "cvss": 9.8,
                                    "severity": "critical",
                                    "status": "open",
                                    "endpoint": route,
                                    "method": "POST",
                                    "curl": f"curl -X POST '{route}' -H 'Content-Type: application/json' -d '{param}={probe}'",
                                    "expected_response": "HTTP 400 Bad Request / sanitized input validation",
                                    "actual_response": f"HTTP {res.status_code}\n\n{res.text[:300]}",
                                    "business_impact": "Full database takeover via unparameterized JSON payload handlers.",
                                    "remediation": "Validate input schema and enforce parameterized database operations.",
                                    "evidence": f"JSON payload `{param}: '{probe}'` triggered database error signature: '{error_signature}'."
                                })
                                return findings
                    except Exception:
                        pass

        # 3. Test Time-Based Blind SQL Injection
        for param in ["search", "query", "id", "filter"][:3]:
            for db_type, time_probe, delay_secs in TIME_PROBES[:2]:
                try:
                    t_start = time.perf_counter()
                    t_res = await client.get(route, params={param: time_probe}, timeout=7.0)
                    elapsed = time.perf_counter() - t_start

                    # If response took > 2.5s and is significantly larger than baseline
                    if elapsed >= (delay_secs - 0.4) and elapsed > (baseline_time + 2.0):
                        findings.append({
                            "scan_id": scan_id,
                            "title": f"Time-Based Blind SQL Injection ({db_type}) in '{param}'",
                            "category": "Injection & Fuzzing",
                            "cwe": "CWE-89",
                            "owasp": "A03:2021-Injection",
                            "cvss": 9.8,
                            "severity": "critical",
                            "status": "open",
                            "endpoint": route,
                            "method": "GET",
                            "curl": f"curl -X GET '{route}?{param}={time_probe}'",
                            "expected_response": f"Immediate response (~{int(baseline_time*1000)}ms)",
                            "actual_response": f"Server delayed execution for {elapsed:.2f}s (Sleep probe executed)",
                            "business_impact": "Allows attackers to extract the entire database character-by-character using time-delay inferences without generating error logs.",
                            "remediation": "Enforce strict parameter binding in SQL queries; ensure no user input is evaluated inside dynamic SQL query strings.",
                            "evidence": f"Injected time probe '{time_probe}' caused latency spike from baseline {baseline_time*1000:.0f}ms to {elapsed*1000:.0f}ms."
                        })
                        return findings
                except Exception:
                    continue

    return findings
