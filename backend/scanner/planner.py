import re
import httpx
from typing import Dict, List, Any, Optional

TECH_SIGNATURES = {
    "Next.js / React": [r'_next/static', r'__NEXT_DATA__', r'next-action', r'react-dom'],
    "FastAPI / Python": [r'fastapi', r'pydantic', r'starlette', r'uvicorn', r'swagger-ui'],
    "Express / Node.js": [r'express', r'node_modules', r'connect.sid', r'x-powered-by: express'],
    "Django / Python": [r'csrftoken', r'django', r'wsgi', r'__admin__'],
    "Laravel / PHP": [r'laravel_session', r'x-powered-by: php', r'laravel'],
    "Ruby on Rails": [r'_rails_', r'authenticity_token', r'phusion_passenger'],
    "Spring Boot / Java": [r'jsessionid', r'whitelabel error page', r'spring-boot']
}

DOMAIN_KEYWORDS = {
    "Fintech & Payments": ["wallet", "balance", "transfer", "payout", "stripe", "payment", "card", "transaction", "invoice", "crypto", "withdraw"],
    "E-Commerce & Orders": ["cart", "checkout", "order", "item", "product", "coupon", "discount", "shipping", "catalog", "inventory"],
    "Multi-Tenant B2B SaaS": ["org", "organization", "team", "workspace", "member", "role", "permission", "tenant", "project", "billing"],
    "Media & Document Services": ["export", "pdf", "convert", "download", "fetch", "url", "image", "upload", "file", "render"],
    "Auth & Identity Service": ["login", "signup", "register", "token", "oauth", "password", "reset", "session", "2fa", "verify"]
}

def fingerprint_tech_stack(html: str, headers: Dict[str, str]) -> List[str]:
    """
    Identifies backend and frontend technology stacks from headers and HTML markup.
    """
    detected = []
    headers_str = " ".join([f"{k}: {v}" for k, v in headers.items()]).lower()
    content_str = (html + " " + headers_str).lower()

    for tech, patterns in TECH_SIGNATURES.items():
        for pat in patterns:
            if re.search(pat, content_str, re.IGNORECASE):
                detected.append(tech)
                break

    return detected if detected else ["Generic Web API"]

def infer_business_domain(routes: List[str], forms: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Infers the primary business domain based on route nouns and interactive form inputs.
    """
    all_text = " ".join(routes).lower()
    for f in forms:
        all_text += " " + f.get("action", "") + " " + " ".join(f.get("inputs", []))

    domain_scores = {}
    for domain, keywords in DOMAIN_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in all_text)
        if score > 0:
            domain_scores[domain] = score

    if not domain_scores:
        return {
            "primary_domain": "REST Microservice / Generic Web App",
            "confidence": "Low",
            "matches": []
        }

    sorted_domains = sorted(domain_scores.items(), key=lambda x: x[1], reverse=True)
    primary = sorted_domains[0][0]

    return {
        "primary_domain": primary,
        "confidence": "High" if sorted_domains[0][1] >= 2 else "Medium",
        "secondary_domain": sorted_domains[1][0] if len(sorted_domains) > 1 else None,
        "score": sorted_domains[0][1]
    }

def generate_adversarial_hypotheses(
    domain_info: Dict[str, Any],
    tech_stacks: List[str],
    routes: List[str],
    params: List[str]
) -> List[Dict[str, Any]]:
    """
    Generates tailored, prioritized attack hypotheses asking:
    1. What is the app doing?
    2. What does it trust?
    3. Where can that trust be violated?
    """
    hypotheses = []
    domain = domain_info.get("primary_domain", "")

    # Universal Hypothesis 1: Boundary Trust
    hypotheses.append({
        "vector": "Boundary Validation",
        "trust_assumption": "Backend assumes frontend validates input types and rejects unexpected nulls/large integers.",
        "violation_strategy": "Inject null bytes, oversized ints, and type confusion to trigger unhandled 500 crashes and stack leaks.",
        "priority": "HIGH"
    })

    # Domain-Specific Hypothesis
    if "Fintech" in domain or "E-Commerce" in domain:
        hypotheses.append({
            "vector": "Business Logic & State Machine",
            "trust_assumption": "Backend assumes checkout / balance mutations execute sequentially and single-threaded.",
            "violation_strategy": "Execute race condition bursts on order/discount routes and fuzz negative numeric values in JSON bodies.",
            "priority": "CRITICAL"
        })
    elif "Multi-Tenant" in domain or "SaaS" in domain:
        hypotheses.append({
            "vector": "Cross-Tenant Authorization (BOLA/IDOR)",
            "trust_assumption": "Backend assumes requesting token belongs to the tenant that owns the requested resource ID.",
            "violation_strategy": "Swap object IDs across tenant boundaries and enumerate sequential resource identifiers.",
            "priority": "CRITICAL"
        })
        hypotheses.append({
            "vector": "Mass Assignment & Role Tampering",
            "trust_assumption": "Backend assumes client only sends fields present in standard UI forms.",
            "violation_strategy": "Inject 'is_admin': true, 'role': 'admin', 'tier': 'enterprise' into profile update endpoints.",
            "priority": "HIGH"
        })

    # Tech-Stack Specific Hypothesis
    if any("FastAPI" in t or "Python" in t for t in tech_stacks):
        hypotheses.append({
            "vector": "SQL / Injection Matrix",
            "trust_assumption": "Backend assumes ORM/database queries are safe from time-delayed string evaluations.",
            "violation_strategy": "Execute differential time-based blind SQLi probes (pg_sleep, SLEEP) on query parameters.",
            "priority": "HIGH"
        })

    return hypotheses

async def plan_adversarial_strategy(
    target_url: str,
    surface: Dict[str, Any],
    client: httpx.AsyncClient
) -> Dict[str, Any]:
    """
    Main Cognitive Planner Entrypoint:
    Executes full reconnaissance, domain modeling, and generates prioritized attack hypotheses.
    """
    html_content = ""
    resp_headers = {}
    try:
        res = await client.get(target_url, timeout=5.0)
        html_content = res.text
        resp_headers = dict(res.headers)
    except Exception:
        pass

    tech_stacks = fingerprint_tech_stack(html_content, resp_headers)
    domain_info = infer_business_domain(surface.get("routes", []), surface.get("forms", []))
    hypotheses = generate_adversarial_hypotheses(
        domain_info,
        tech_stacks,
        surface.get("routes", []),
        surface.get("parameters", [])
    )

    return {
        "tech_stacks": tech_stacks,
        "domain": domain_info,
        "hypotheses": hypotheses,
        "attack_focus": hypotheses[0]["vector"] if hypotheses else "Universal DAST"
    }
