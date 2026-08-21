import json
import re
import httpx
from typing import Dict, Any, List, Optional
from config import GEMINI_API_KEY

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

async def call_gemini(prompt: str) -> Optional[str]:
    """
    Direct asynchronous HTTP call to Google Gemini 2.5 Flash API with optimized fast-thinking budget.
    """
    if not GEMINI_API_KEY:
        return None

    url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2500,
            "responseMimeType": "application/json",
            "thinkingConfig": {
                "thinkingBudget": 0
            }
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text
            else:
                print(f"[Gemini] API returned status {res.status_code}: {res.text[:180]}")
    except Exception as e:
        print(f"[Gemini] Error contacting Gemini API: {e}")

    return None

def clean_code_block(code_str: str) -> str:
    """Removes outer markdown fences if present."""
    if not code_str:
        return ""
    code_str = code_str.strip()
    if code_str.startswith("```"):
        lines = code_str.splitlines()
        if len(lines) > 2:
            return "\n".join(lines[1:-1]).strip()
    return code_str

async def generate_ai_remediation_patch(
    finding: Dict[str, Any],
    tech_stacks: List[str]
) -> Dict[str, str]:
    """
    Generates tailored before/after code patches using Gemini for the detected framework.
    """
    primary_tech = tech_stacks[0] if tech_stacks else "Generic Web App"
    
    prompt = f"""
You are an expert Principal AppSec Engineer. Generate a framework-specific code remediation patch for this vulnerability.

Target Framework: {primary_tech}
Vulnerability: {finding.get('title')}
CWE: {finding.get('cwe')}
OWASP: {finding.get('owasp')}
Endpoint: {finding.get('method')} {finding.get('endpoint')}
Evidence: {finding.get('evidence')}
Remediation Goal: {finding.get('remediation')}

Respond ONLY with a valid JSON object matching this exact schema:
{{
  "language": "{primary_tech}",
  "root_cause": "1-2 sentence explanation of the root cause and risk",
  "vulnerable_code": "Realistic 4-10 line code snippet showing the insecure pattern in {primary_tech}",
  "secure_code": "Realistic 6-18 line production-ready fix in {primary_tech}"
}}
"""
    raw_json = await call_gemini(prompt)
    if raw_json:
        try:
            parsed = json.loads(raw_json)
            return {
                "language": parsed.get("language", primary_tech),
                "root_cause": parsed.get("root_cause", ""),
                "vulnerable_code": clean_code_block(parsed.get("vulnerable_code", "")),
                "secure_code": clean_code_block(parsed.get("secure_code", ""))
            }
        except Exception as e:
            print(f"[Gemini] JSON parsing error: {e}")

    # Fallback to deterministic generator if Gemini is offline
    return {
        "language": "text",
        "root_cause": "Input was processed without strict authorization or validation boundaries.",
        "vulnerable_code": f"// Insecure endpoint handler on {finding.get('endpoint')}\napp.all('{finding.get('endpoint')}', (req, res) => {{\n  // Missing security guard\n}});",
        "secure_code": f"// Apply secure validation:\n{finding.get('remediation')}"
    }
