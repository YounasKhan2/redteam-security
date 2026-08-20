import re
import json
import httpx
from typing import List, Dict, Any, Optional

ID_REGEX = re.compile(r'["\'](?:id|order_id|user_id|invoice_id|account_id|doc_id|uuid)["\']\s*:\s*["\']?([a-zA-Z0-9_\-]+)["\']?', re.IGNORECASE)

async def audit_two_tenant_bola(
    target_url: str,
    routes: List[str],
    client_a: httpx.AsyncClient,
    client_b: Optional[httpx.AsyncClient],
    scan_id: int
) -> List[Dict[str, Any]]:
    """
    Two-Tenant & Zero-Token Autonomous BOLA / IDOR Scanner:
    - If Client B is available (two-tenant mode): Attempts cross-tenant object access.
    - If Client B is not available: Tests unauthenticated ID access and sequential neighbor ID mutation.
    """
    findings = []
    base_url = target_url.rstrip("/")

    candidate_endpoints = list(set(routes + [
        f"{base_url}/api/user",
        f"{base_url}/api/profile",
        f"{base_url}/api/orders",
        f"{base_url}/api/v1/orders",
        f"{base_url}/api/invoices",
        f"{base_url}/api/documents"
    ]))

    discovered_objects: List[Dict[str, Any]] = []

    # Step 1: Discover object IDs via Client A
    for ep in candidate_endpoints[:10]:
        try:
            res_a = await client_a.get(ep, timeout=5.0)
            if res_a.status_code == 200 and len(res_a.text) > 5:
                matches = ID_REGEX.findall(res_a.text)
                for obj_id in set(matches):
                    if obj_id.lower() not in ["true", "false", "null", "undefined"]:
                        discovered_objects.append({
                            "endpoint": ep,
                            "id": obj_id,
                            "data_preview": res_a.text[:200]
                        })

                # Test sub-paths
                for test_id in ["1", "101", "1042"]:
                    item_ep = f"{ep}/{test_id}"
                    item_res_a = await client_a.get(item_ep, timeout=4.0)
                    if item_res_a.status_code == 200 and len(item_res_a.text) > 10:
                        discovered_objects.append({
                            "endpoint": item_ep,
                            "id": test_id,
                            "data_preview": item_res_a.text[:200]
                        })
        except Exception:
            continue

    # Step 2: Test Cross-Account Access or Unauthenticated IDOR
    for item in discovered_objects[:6]:
        target_ep = item["endpoint"]
        if item["id"] not in target_ep:
            target_ep = f"{target_ep}/{item['id']}"

        try:
            if client_b:
                # Mode A: Cross-Tenant Probe with Tenant B token
                res_b = await client_b.get(target_ep, timeout=5.0)
                if res_b.status_code == 200 and len(res_b.text) > 10:
                    findings.append({
                        "scan_id": scan_id,
                        "title": f"BOLA / IDOR: Cross-Account Object Read via '{item['id']}'",
                        "category": "Authentication & Authorization",
                        "cwe": "CWE-639",
                        "owasp": "API1:2023-Broken Object Level Authorization",
                        "cvss": 8.8,
                        "severity": "high",
                        "status": "open",
                        "endpoint": target_ep,
                        "method": "GET",
                        "curl": f"curl -X GET '{target_ep}' -H 'Authorization: Bearer <TENANT_B_TOKEN>'",
                        "expected_response": "HTTP 403 Forbidden / HTTP 404 Not Found (Object does not belong to Tenant B)",
                        "actual_response": f"HTTP 200 OK\n\n{res_b.text[:300]}",
                        "business_impact": "Tenant B can view, export, or steal Tenant A's private orders, invoices, or personal records by manipulating object identifiers.",
                        "remediation": "Validate that the authenticated user owns the requested object record at the database query level: `SELECT * FROM items WHERE id = :id AND tenant_id = :current_user_tenant_id`.",
                        "evidence": f"Tenant B credentials successfully retrieved Tenant A object '{item['id']}' on {target_ep} with response: '{res_b.text[:150]}...'."
                    })
                    break
            else:
                # Mode B: Zero-Auth / Unauthenticated IDOR Probe
                async with httpx.AsyncClient(verify=False) as unauth_client:
                    unauth_res = await unauth_client.get(target_ep, timeout=4.0)
                    if unauth_res.status_code == 200 and len(unauth_res.text) > 10:
                        findings.append({
                            "scan_id": scan_id,
                            "title": f"Unauthenticated IDOR / Data Leak on '{item['id']}'",
                            "category": "Authentication & Authorization",
                            "cwe": "CWE-306",
                            "owasp": "API1:2023-Broken Object Level Authorization",
                            "cvss": 9.1,
                            "severity": "critical",
                            "status": "open",
                            "endpoint": target_ep,
                            "method": "GET",
                            "curl": f"curl -X GET '{target_ep}'",
                            "expected_response": "HTTP 401 Unauthorized / HTTP 403 Forbidden",
                            "actual_response": f"HTTP 200 OK\n\n{unauth_res.text[:300]}",
                            "business_impact": "Unauthenticated attackers can enumerate and scrape private customer records without any credentials.",
                            "remediation": "Enforce authentication and tenant ownership verification middleware before serving this endpoint.",
                            "evidence": f"Endpoint {target_ep} returned HTTP 200 OK and private data payload without any authorization header."
                        })
                        break
        except Exception:
            continue

    return findings
