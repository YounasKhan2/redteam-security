import asyncio
import json
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks, Query, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import HOST, PORT, ENVIRONMENT
from database import supabase_admin
from scanner.models import ScanRequest
from scanner.engine import run_scan

app = FastAPI(
    title="RedTeam AI Adversarial QA & Security Platform API",
    description="Backend engine for continuous adversarial security testing and CI/CD gating.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "service": "RedTeam Security QA Engine",
        "status": "online",
        "timestamp": datetime.utcnow().isoformat()
    }

# 1. Stats Endpoint
@app.get("/api/stats")
async def get_stats():
    if not supabase_admin:
        return {"error": "Database not configured"}
    
    scans_res = supabase_admin.table("scans").select("*").execute()
    findings_res = supabase_admin.table("findings").select("*").execute()
    
    scans = scans_res.data or []
    findings = findings_res.data or []
    
    open_findings = [f for f in findings if f.get("status") in ["open", "in_review"]]
    by_severity = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for f in open_findings:
        sev = f.get("severity", "low").lower()
        if sev in by_severity:
            by_severity[sev] += 1

    cat_map = {}
    for f in open_findings:
        cat = f.get("category", "General")
        cat_map[cat] = cat_map.get(cat, 0) + 1
    by_category = [{"category": k, "count": v} for k, v in sorted(cat_map.items(), key=lambda x: x[1], reverse=True)]

    completed = [s for s in scans if s.get("status") == "completed"]
    passed = len([s for s in completed if s.get("gate_status") == "pass"])
    dismissed = len([f for f in findings if f.get("status") == "dismissed"])
    avg_cvss = sum(float(f.get("cvss", 0)) for f in open_findings) / max(1, len(open_findings))

    scan_names = {s["id"]: s.get("name", "") for s in scans}
    recent = sorted(findings, key=lambda x: x.get("discovered_at", ""), reverse=True)[:6]
    for r in recent:
        r["scan_name"] = scan_names.get(r.get("scan_id"), "")

    return {
        "total_scans": len(scans),
        "running_scans": len([s for s in scans if s.get("status") == "running"]),
        "completed_scans": len(completed),
        "total_findings": len(findings),
        "open_findings": len(open_findings),
        "dismissed_findings": dismissed,
        "by_severity": by_severity,
        "by_category": by_category,
        "gate_pass_rate": round((passed / max(1, len(completed))) * 100),
        "false_positive_rate": round((dismissed / max(1, len(findings))) * 100),
        "avg_cvss": round(avg_cvss, 1),
        "recent_findings": recent
    }

# 2. Scans Endpoints
@app.get("/api/scans")
async def get_scans(id: Optional[int] = None):
    if not supabase_admin:
        return []
    if id is not None:
        res = supabase_admin.table("scans").select("*").eq("id", id).limit(1).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Scan not found")
        return res.data[0]
    
    res = supabase_admin.table("scans").select("*").order("started_at", desc=True).execute()
    return res.data or []

@app.post("/api/scans")
async def create_scan(req: ScanRequest, background_tasks: BackgroundTasks):
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Database not configured")

    new_scan = {
        "name": req.name,
        "target_url": req.target_url,
        "spec_type": req.spec_type,
        "environment": req.environment,
        "status": "running",
        "progress": 0,
        "modules": req.modules,
        "started_at": datetime.utcnow().isoformat(),
        "requests_sent": 0,
        "critical_count": 0,
        "high_count": 0,
        "medium_count": 0,
        "low_count": 0,
        "gate_status": None
    }
    
    res = supabase_admin.table("scans").insert(new_scan).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create scan record")
    
    created_scan = res.data[0]
    scan_id = created_scan["id"]

    background_tasks.add_task(
        run_scan, 
        scan_id=scan_id, 
        target_url=req.target_url, 
        auth_headers=req.auth_headers, 
        modules=req.modules
    )

    return created_scan

# 3. Real-Time SSE Streaming Endpoint (Zero Polling)
@app.get("/api/scans/stream")
async def stream_scan(id: int):
    """
    Streams live scan updates (events, progress, findings) over a single persistent Server-Sent Events (SSE) connection.
    """
    async def event_generator():
        last_event_id = 0
        last_finding_id = 0
        
        while True:
            if not supabase_admin:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Database not connected'})}\n\n"
                break

            # 1. Fetch current scan state
            s_res = supabase_admin.table("scans").select("*").eq("id", id).limit(1).execute()
            if not s_res.data:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Scan not found'})}\n\n"
                break
            
            scan = s_res.data[0]
            
            # 2. Fetch any new events
            e_res = supabase_admin.table("scan_events").select("*").eq("scan_id", id).gt("id", last_event_id).order("id", desc=False).execute()
            new_events = e_res.data or []
            if new_events:
                last_event_id = new_events[-1]["id"]
                yield f"data: {json.dumps({'type': 'events', 'events': new_events})}\n\n"

            # 3. Fetch any new findings
            f_res = supabase_admin.table("findings").select("*").eq("scan_id", id).gt("id", last_finding_id).order("id", desc=False).execute()
            new_findings = f_res.data or []
            if new_findings:
                last_finding_id = new_findings[-1]["id"]
                yield f"data: {json.dumps({'type': 'findings', 'findings': new_findings})}\n\n"

            # 4. Stream progress update
            yield f"data: {json.dumps({'type': 'scan_update', 'scan': scan})}\n\n"

            # 5. Terminate cleanly once scan completes
            if scan.get("status") == "completed":
                yield f"data: {json.dumps({'type': 'done', 'scan': scan})}\n\n"
                break

            await asyncio.sleep(1.0)  # Lightweight 1s tick inside single open stream

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# 4. Findings Endpoints
@app.get("/api/findings")
async def get_findings(
    scan_id: Optional[int] = None, 
    severity: Optional[str] = None, 
    limit: Optional[int] = None
):
    if not supabase_admin:
        return []
    
    query = supabase_admin.table("findings").select("*")
    if scan_id is not None:
        query = query.eq("scan_id", scan_id)
    if severity:
        query = query.eq("severity", severity.lower())
        
    query = query.order("discovered_at", desc=True)
    if limit:
        query = query.limit(limit)
        
    res = query.execute()
    return res.data or []

class FindingUpdate(BaseModel):
    id: int
    status: str

@app.put("/api/findings")
@app.patch("/api/findings")
async def update_finding(body: FindingUpdate):
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    res = supabase_admin.table("findings").update({"status": body.status}).eq("id", body.id).execute()
    return res.data or {}

# 5. Scan Events & Logs
@app.get("/api/events")
async def get_events(scan_id: int):
    if not supabase_admin:
        return []
    res = supabase_admin.table("scan_events").select("*").eq("scan_id", scan_id).order("ts", desc=False).execute()
    return res.data or []

# 6. QA Report Generation
@app.get("/api/report")
async def get_report(scan_id: int):
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    scan_res = supabase_admin.table("scans").select("*").eq("id", scan_id).limit(1).execute()
    if not scan_res.data:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    scan = scan_res.data[0]
    findings_res = supabase_admin.table("findings").select("*").eq("scan_id", scan_id).execute()
    findings = findings_res.data or []

    md = f"""# 🛡️ Adversarial QA Security Report
**Target**: `{scan.get('target_url')}`  
**Scan Name**: {scan.get('name')}  
**Date**: {scan.get('started_at')}  
**CI Gate Verdict**: **{str(scan.get('gate_status', 'N/A')).upper()}**  

---

## Executive Summary
- **Requests Sent**: {scan.get('requests_sent')}
- **Total Findings**: {len(findings)}
- **Critical**: {scan.get('critical_count', 0)} | **High**: {scan.get('high_count', 0)} | **Medium**: {scan.get('medium_count', 0)} | **Low**: {scan.get('low_count', 0)}

---

## Detailed Findings
"""
    for idx, f in enumerate(findings, 1):
        md += f"""
### {idx}. [{f.get('severity', '').upper()}] {f.get('title')}
- **CWE**: `{f.get('cwe')}` | **OWASP**: `{f.get('owasp')}` | **CVSS**: `{f.get('cvss')}`
- **Endpoint**: `{f.get('method')} {f.get('endpoint')}`
- **Business Impact**: {f.get('business_impact')}

#### Reproduction Step:
```bash
{f.get('curl')}
```

#### Remediation Recommendation:
> {f.get('remediation')}

---
"""
    return {"markdown": md}

# 7. Content endpoint
@app.get("/api/content")
async def get_content(type: Optional[str] = "all"):
    if not supabase_admin:
        return {}
    
    if type == "modules":
        res = supabase_admin.table("test_modules").select("*").order("id", desc=False).execute()
        return res.data or []
        
    res_f = supabase_admin.table("features").select("*").order("sort_order", desc=False).execute()
    res_w = supabase_admin.table("workflow_steps").select("*").order("step_number", desc=False).execute()
    res_m = supabase_admin.table("test_modules").select("*").order("id", desc=False).execute()
    res_r = supabase_admin.table("roadmap_phases").select("*").order("id", desc=False).execute()
    res_d = supabase_admin.table("deployment_options").select("*").order("sort_order", desc=False).execute()
    res_p = supabase_admin.table("personas").select("*").order("sort_order", desc=False).execute()

    return {
        "features": res_f.data or [],
        "workflow": res_w.data or [],
        "modules": res_m.data or [],
        "roadmap": res_r.data or [],
        "deployments": res_d.data or [],
        "personas": res_p.data or []
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
