import httpx
from typing import List, Dict, Any

async def audit_security_headers(target_url: str, client: httpx.AsyncClient, scan_id: int) -> List[Dict[str, Any]]:
    findings = []
    try:
        res = await client.get(target_url, timeout=10.0, follow_redirects=True)
        headers = {k.lower(): v for k, v in res.headers.items()}
        
        # 1. Check Strict-Transport-Security (HSTS)
        if "strict-transport-security" not in headers and target_url.startswith("https://"):
            findings.append({
                "scan_id": scan_id,
                "title": "Missing HTTP Strict Transport Security (HSTS)",
                "category": "Transport Security",
                "cwe": "CWE-319",
                "owasp": "A05:2021-Security Misconfiguration",
                "cvss": 4.3,
                "severity": "low",
                "status": "open",
                "endpoint": target_url,
                "method": "GET",
                "curl": f"curl -I {target_url}",
                "expected_response": "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
                "actual_response": f"HTTP {res.status_code}\n" + "\n".join([f"{k}: {v}" for k, v in res.headers.items() if k in ['content-type', 'server', 'date']]),
                "business_impact": "Allows potential man-in-the-middle (MITM) downgrade attacks over insecure public networks.",
                "remediation": "Add the 'Strict-Transport-Security: max-age=31536000; includeSubDomains' header in reverse proxy or web server configuration.",
                "evidence": f"Header 'Strict-Transport-Security' was not present in HTTP response headers from {target_url}."
            })
            
        # 2. Check Content-Security-Policy (CSP)
        if "content-security-policy" not in headers:
            findings.append({
                "scan_id": scan_id,
                "title": "Missing Content-Security-Policy (CSP)",
                "category": "Injection & Fuzzing",
                "cwe": "CWE-1021",
                "owasp": "A05:2021-Security Misconfiguration",
                "cvss": 5.7,
                "severity": "medium",
                "status": "open",
                "endpoint": target_url,
                "method": "GET",
                "curl": f"curl -I {target_url}",
                "expected_response": "Content-Security-Policy: default-src 'self'; script-src 'self' ...",
                "actual_response": "Content-Security-Policy header is missing",
                "business_impact": "Leaves web application susceptible to Cross-Site Scripting (XSS) and data injection attacks.",
                "remediation": "Configure a Content-Security-Policy (CSP) header that restricts script, frame, and object sources.",
                "evidence": f"No Content-Security-Policy header found in response from {target_url}."
            })

        # 3. Check X-Frame-Options (Clickjacking)
        if "x-frame-options" not in headers and "content-security-policy" not in headers:
            findings.append({
                "scan_id": scan_id,
                "title": "Missing Clickjacking Protection (X-Frame-Options)",
                "category": "Security Misconfiguration",
                "cwe": "CWE-1021",
                "owasp": "A05:2021-Security Misconfiguration",
                "cvss": 4.8,
                "severity": "medium",
                "status": "open",
                "endpoint": target_url,
                "method": "GET",
                "curl": f"curl -I {target_url}",
                "expected_response": "X-Frame-Options: DENY or SAMEORIGIN",
                "actual_response": "X-Frame-Options header is absent",
                "business_impact": "An attacker can frame the application inside a transparent iframe to trick users into unauthorized clicks.",
                "remediation": "Add 'X-Frame-Options: SAMEORIGIN' or configure CSP 'frame-ancestors' directive.",
                "evidence": f"The page {target_url} can be embedded in arbitrary iframes."
            })

        # 4. Check Permissive CORS Access-Control-Allow-Origin
        cors = headers.get("access-control-allow-origin")
        if cors == "*":
            findings.append({
                "scan_id": scan_id,
                "title": "Permissive Cross-Origin Resource Sharing (CORS: *)",
                "category": "Authentication & Authorization",
                "cwe": "CWE-346",
                "owasp": "A01:2021-Broken Access Control",
                "cvss": 6.5,
                "severity": "medium",
                "status": "open",
                "endpoint": target_url,
                "method": "OPTIONS",
                "curl": f"curl -X OPTIONS {target_url} -H 'Origin: https://evil.attacker.com'",
                "expected_response": "Access-Control-Allow-Origin restricted to trusted domains",
                "actual_response": "Access-Control-Allow-Origin: *",
                "business_impact": "Allows arbitrary third-party websites to make cross-origin requests and read unauthenticated responses.",
                "remediation": "Restrict 'Access-Control-Allow-Origin' to an explicit whitelist of trusted application origins.",
                "evidence": f"Wildcard Access-Control-Allow-Origin: * detected on {target_url}."
            })

    except Exception as e:
        print(f"[Module:SecurityHeaders] Error testing {target_url}: {e}")
        
    return findings
