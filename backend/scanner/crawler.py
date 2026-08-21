import re
import json
import httpx
from urllib.parse import urljoin, urlparse
from typing import Dict, List, Set, Any

API_ROUTE_REGEX = re.compile(r'["\'](/api/[a-zA-Z0-9_\-\./]+|/v[0-9]/[a-zA-Z0-9_\-\./]+|/auth/[a-zA-Z0-9_\-\./]+)["\']')
SCRIPT_TAG_REGEX = re.compile(r'<script[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)
FORM_REGEX = re.compile(r'<form[^>]*action=["\']([^"\']*)["\'][^>]*method=["\']?([a-zA-Z]+)?["\']?[^>]*>(.*?)</form>', re.DOTALL | re.IGNORECASE)
INPUT_NAME_REGEX = re.compile(r'<input[^>]+name=["\']([^"\']+)["\']', re.IGNORECASE)
A_HREF_REGEX = re.compile(r'<a[^>]+href=["\']([^"\'#]+)["\']', re.IGNORECASE)
PATH_PARAM_REGEX = re.compile(r'/(?:[0-9]+|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', re.IGNORECASE)

OPENAPI_ENDPOINTS = [
    "/openapi.json",
    "/swagger.json",
    "/v2/api-docs",
    "/v3/api-docs",
    "/api-docs",
    "/docs",
    "/api/docs"
]

GRAPHQL_INTROSPECTION_QUERY = {
    "query": "{ __schema { types { name fields { name } } } }"
}

async def crawl_target_surface(target_url: str, client: httpx.AsyncClient) -> Dict[str, Any]:
    """
    Advanced Universal Surface Crawler:
    1. HTML Links, Forms & Input extraction
    2. Client-Side JavaScript bundle decompilation
    3. Automated OpenAPI / Swagger schema discovery & parsing
    4. GraphQL endpoint & introspection detection
    """
    discovered_routes: Set[str] = set()
    discovered_forms: List[Dict[str, Any]] = []
    discovered_params: Set[str] = {"id", "user_id", "query", "search", "url", "redirect", "username", "password", "email", "token", "role"}
    dynamic_param_routes: List[str] = []

    base_domain = urlparse(target_url).netloc
    base_url = target_url.rstrip("/")

    # Default probe routes
    discovered_routes.update([
        target_url,
        urljoin(target_url, "/api/auth/login"),
        urljoin(target_url, "/api/auth/signup"),
        urljoin(target_url, "/api/login"),
        urljoin(target_url, "/api/user"),
        urljoin(target_url, "/api/profile"),
        urljoin(target_url, "/api/search"),
        urljoin(target_url, "/api/orders")
    ])

    # Step 1: Check for OpenAPI / Swagger specifications
    for spec_path in OPENAPI_ENDPOINTS:
        spec_url = urljoin(target_url, spec_path)
        try:
            res = await client.get(spec_url, timeout=4.0)
            if res.status_code == 200:
                try:
                    spec_data = res.json()
                    if isinstance(spec_data, dict) and ("paths" in spec_data or "swagger" in spec_data or "openapi" in spec_data):
                        paths = spec_data.get("paths", {})
                        for p in paths.keys():
                            discovered_routes.add(urljoin(target_url, p))
                        print(f"[Crawler] Successfully ingested {len(paths)} routes from OpenAPI spec: {spec_url}")
                except Exception:
                    pass
        except Exception:
            continue

    # Step 2: Check for GraphQL endpoint
    for gql_path in ["/graphql", "/api/graphql"]:
        gql_url = urljoin(target_url, gql_path)
        try:
            res = await client.post(gql_url, json=GRAPHQL_INTROSPECTION_QUERY, timeout=4.0)
            if res.status_code == 200 and "__schema" in res.text:
                discovered_routes.add(gql_url)
                print(f"[Crawler] Discovered GraphQL schema at {gql_url}")
        except Exception:
            continue

    # Step 3: Crawl HTML & Extract Forms / Links
    try:
        res = await client.get(target_url, timeout=8.0)
        html = res.text

        # Extract Forms
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

        # Extract Links
        for href in A_HREF_REGEX.findall(html):
            if not href.startswith(("mailto:", "tel:", "javascript:")):
                full_link = urljoin(target_url, href)
                if urlparse(full_link).netloc == base_domain:
                    discovered_routes.add(full_link)
                    if PATH_PARAM_REGEX.search(href):
                        dynamic_param_routes.append(full_link)

        # Extract & Parse JavaScript Bundles
        script_srcs = SCRIPT_TAG_REGEX.findall(html)
        for src in script_srcs[:10]:
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
        "parameters": list(discovered_params),
        "dynamic_routes": dynamic_param_routes
    }
