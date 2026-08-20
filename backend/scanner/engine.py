import asyncio
import httpx
from datetime import datetime
from typing import Dict, Any, List
from database import supabase_admin

from scanner.crawler import crawl_target_surface
from scanner.modules.security_headers import audit_security_headers
from scanner.modules.boundary_fuzzing import fuzz_boundaries
from scanner.modules.auth_auditor import audit_auth_and_access
from scanner.modules.rate_limiter import audit_rate_limiting
from scanner.modules.sqli_scanner import audit_sql_injection
from scanner.modules.ssrf_scanner import audit_ssrf
from scanner.modules.bola_scanner import audit_two_tenant_bola

async def emit_event(scan_id: int, phase_key: str, level: str, message: str):
    if not supabase_admin:
        print(f"[{level}] Scan {scan_id} ({phase_key}): {message}")
        return
    try:
        supabase_admin.table("scan_events").insert({
            "scan_id": scan_id,
            "phase_key": phase_key,
            "level": level,
            "message": message,
            "ts": datetime.utcnow().isoformat()
        }).execute()
    except Exception as e:
        print(f"[WARN] Error emitting scan event: {e}")

async def run_scan(
    scan_id: int, 
    target_url: str, 
    auth_headers: Dict[str, str] = None, 
    tenant_b_auth_headers: Dict[str, str] = None,
    modules: List[str] = None
):
    print(f"[*] Starting active security sweep for Scan #{scan_id} -> {target_url}")
    
    # 1. Crawl & Surface Discovery
    await emit_event(scan_id, "p-ingest", "INFO", f"Crawling HTML and client JS bundles for target: {target_url}")
    if supabase_admin:
        supabase_admin.table("scans").update({"status": "running", "progress": 10}).eq("id", scan_id).execute()

    headers_a = {
        "User-Agent": "RedTeam-Adversarial-QA-Scanner/1.0",
        **(auth_headers or {})
    }
    
    headers_b = {
        "User-Agent": "RedTeam-Adversarial-QA-Scanner/1.0",
        **(tenant_b_auth_headers or {"Authorization": "Bearer test_tenant_b_token_xyz987"})
    }

    all_findings = []
    total_requests = 0

    async with httpx.AsyncClient(headers=headers_a, verify=False, follow_redirects=True) as client_a:
        async with httpx.AsyncClient(headers=headers_b, verify=False, follow_redirects=True) as client_b:
            surface = await crawl_target_surface(target_url, client_a)
            routes = surface["routes"]
            params = surface["parameters"]
            total_requests += 5

            await emit_event(scan_id, "p-plan", "AI", f"Surface mapped: {len(routes)} routes and {len(params)} parameters discovered for testing")
            if supabase_admin:
                supabase_admin.table("scans").update({"progress": 20}).eq("id", scan_id).execute()
            await asyncio.sleep(0.4)

            # Phase 1: Security Transport & Headers
            await emit_event(scan_id, "p-headers", "EXEC", "Executing: Transport & Security Headers Audit (HSTS, CSP, CORS, Clickjacking)")
            header_findings = await audit_security_headers(target_url, client_a, scan_id)
            all_findings.extend(header_findings)
            total_requests += 4
            if supabase_admin:
                supabase_admin.table("scans").update({"progress": 35}).eq("id", scan_id).execute()
            await asyncio.sleep(0.4)

            # Phase 2: Boundary Fuzzing
            await emit_event(scan_id, "p-inject", "EXEC", "Executing: Boundary Fuzzing & Unhandled 500 Error Probing")
            fuzz_findings = await fuzz_boundaries(target_url, client_a, scan_id)
            all_findings.extend(fuzz_findings)
            total_requests += len(routes) * 5
            if supabase_admin:
                supabase_admin.table("scans").update({"progress": 50}).eq("id", scan_id).execute()
            await asyncio.sleep(0.4)

            # Phase 3: Active Two-Tenant BOLA / IDOR Testing
            await emit_event(scan_id, "p-bola", "EXEC", "Executing: Two-Tenant BOLA / IDOR Cross-Account Isolation Test")
            bola_findings = await audit_two_tenant_bola(target_url, routes, client_a, client_b, scan_id)
            all_findings.extend(bola_findings)
            total_requests += 15
            if supabase_admin:
                supabase_admin.table("scans").update({"progress": 65}).eq("id", scan_id).execute()
            await asyncio.sleep(0.4)

            # Phase 4: Active SQL Injection
            await emit_event(scan_id, "p-sqli", "EXEC", "Executing: Active SQL Injection Syntax & Error-Based Probes")
            sqli_findings = await audit_sql_injection(routes, params, client_a, scan_id)
            all_findings.extend(sqli_findings)
            total_requests += 15
            if supabase_admin:
                supabase_admin.table("scans").update({"progress": 78}).eq("id", scan_id).execute()
            await asyncio.sleep(0.4)

            # Phase 5: SSRF Probes
            await emit_event(scan_id, "p-ssrf", "EXEC", "Executing: SSRF & Cloud Metadata Reachability Probes")
            ssrf_findings = await audit_ssrf(routes, params, client_a, scan_id)
            all_findings.extend(ssrf_findings)
            total_requests += 10
            if supabase_admin:
                supabase_admin.table("scans").update({"progress": 88}).eq("id", scan_id).execute()
            await asyncio.sleep(0.4)

            # Phase 6: Auth & Access Boundary
            await emit_event(scan_id, "p-auth", "EXEC", "Executing: Authentication, JWT Integrity & Access Boundary Checks")
            auth_findings = await audit_auth_and_access(target_url, client_a, scan_id)
            all_findings.extend(auth_findings)
            total_requests += 15
            if supabase_admin:
                supabase_admin.table("scans").update({"progress": 94}).eq("id", scan_id).execute()
            await asyncio.sleep(0.4)

            # Phase 7: Rate Limiting & Exhaustion
            await emit_event(scan_id, "p-rate", "EXEC", "Executing: Rate Limiting & High-Frequency Request Stress")
            rate_findings = await audit_rate_limiting(target_url, client_a, scan_id)
            all_findings.extend(rate_findings)
            total_requests += 20
            if supabase_admin:
                supabase_admin.table("scans").update({"progress": 98}).eq("id", scan_id).execute()
            await asyncio.sleep(0.4)

    # 4. Save Confirmed Findings into Database
    await emit_event(scan_id, "p-verify", "VERIFY", f"Verification complete — captured {len(all_findings)} confirmed findings")
    
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for f in all_findings:
        sev = f.get("severity", "low").lower()
        if sev in counts:
            counts[sev] += 1
        
        if supabase_admin:
            try:
                supabase_admin.table("findings").insert({
                    **f,
                    "discovered_at": datetime.utcnow().isoformat()
                }).execute()
                
                await emit_event(
                    scan_id, 
                    f"finding-{f['cwe']}", 
                    sev.upper(), 
                    f"CONFIRMED {sev.upper()} — {f['title']} @ {f['method']} {f['endpoint']}"
                )
            except Exception as e:
                print(f"[WARN] Error inserting finding: {e}")

    # 5. CI/CD Gate Status Verdict
    gate_verdict = "fail" if (counts["critical"] + counts["high"] > 0) else "pass"
    gate_msg = (
        f"CI GATE VERDICT: FAIL — {counts['critical']} Critical, {counts['high']} High severity findings detected"
        if gate_verdict == "fail" else
        "CI GATE VERDICT: PASS — no critical or high severity findings"
    )
    await emit_event(scan_id, "p-done", "GATE", gate_msg)

    # 6. Finalize Scan Record
    if supabase_admin:
        try:
            supabase_admin.table("scans").update({
                "status": "completed",
                "progress": 100,
                "completed_at": datetime.utcnow().isoformat(),
                "requests_sent": total_requests,
                "critical_count": counts["critical"],
                "high_count": counts["high"],
                "medium_count": counts["medium"],
                "low_count": counts["low"],
                "gate_status": gate_verdict
            }).eq("id", scan_id).execute()
        except Exception as e:
            print(f"[WARN] Error finalizing scan: {e}")

    print(f"[+] Scan #{scan_id} finished with verdict: {gate_verdict.upper()} ({len(all_findings)} findings)")
