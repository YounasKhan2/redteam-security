import re
import httpx
from urllib.parse import urljoin, urlparse
from typing import Dict, List, Set, Any

API_ROUTE_REGEX = re.compile(r'["\'](/api/[a-zA-Z0-9_\-\./]+|/v[0-9]/[a-zA-Z0-9_\-\./]+|/auth/[a-zA-Z0-9_\-\./]+)["\']')
SCRIPT_TAG_REGEX = re.compile(r'<script[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)
FORM_REGEX = re.compile(r'<form[^>]*action=["\']([^"\']*)["\'][^>]*method=["\']?([a-zA-Z]+)?["\']?[^>]*>(.*?)</form>', re.DOTALL | re.IGNORECASE)
INPUT_NAME_REGEX = re.compile(r'<input[^>]+name=["\']([^"\']+)["\']', re.IGNORECASE)

async def crawl_target_surface(target_url: str, client: httpx.AsyncClient) -> Dict[str, Any]:
    """
    Crawls target HTML, extracts forms and parameters, and parses client JS bundles for API routes.
    """
    discovered_routes: Set[str] = set()
    discovered_forms: List[Dict[str, Any]] = []
    discovered_params: Set[str] = {"id", "user_id", "query", "search", "url", "redirect", "username", "password", "email"}

    # Base probe routes
    discovered_routes.update([
        target_url,
        urljoin(target_url, "/api/auth/login"),
        urljoin(target_url, "/api/login"),
        urljoin(target_url, "/api/user"),
        urljoin(target_url, "/api/profile"),
        urljoin(target_url, "/api/search")
    ])

    try:
        res = await client.get(target_url, timeout=8.0)
        html = res.text

        # 1. Extract Forms & Input Fields
        for action, method, form_body in FORM_REGEX.findall(html):
            method = (method or "POST").upper()
            action_url = urljoin(target_url, action) if action else target_url
            inputs = INPUT_NAME_REGEX.findall(form_body)
            discovered_forms.append({
                "action": action_url,
                "method": method,
                "inputs": inputs
            })
            discovered_routes.add(action_url)
            discovered_params.update(inputs)

        # 2. Extract & Parse JavaScript Bundles
        script_srcs = SCRIPT_TAG_REGEX.findall(html)
        for src in script_srcs[:5]:
            js_url = urljoin(target_url, src)
            try:
                js_res = await client.get(js_url, timeout=6.0)
                if js_res.status_code == 200:
                    found_apis = API_ROUTE_REGEX.findall(js_res.text)
                    for api_path in found_apis:
                        if not api_path.endswith((".png", ".jpg", ".svg", ".css", ".js")):
                            full_api_url = urljoin(target_url, api_path)
                            discovered_routes.add(full_api_url)
            except Exception:
                continue

    except Exception as e:
        print(f"[Crawler] Warning during crawl: {e}")

    return {
        "routes": list(discovered_routes),
        "forms": discovered_forms,
        "parameters": list(discovered_params)
    }
