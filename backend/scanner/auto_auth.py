import re
import uuid
import httpx
from typing import Dict, Optional, Tuple
from urllib.parse import urljoin

REGISTRATION_ENDPOINTS = [
    "/api/auth/signup",
    "/api/auth/register",
    "/api/register",
    "/api/signup",
    "/auth/register",
    "/auth/signup",
    "/register",
    "/signup"
]

def extract_token_from_response(res: httpx.Response) -> Optional[str]:
    """
    Extracts Bearer token or session JWT from JSON payload or Set-Cookie header.
    """
    try:
        data = res.json()
        if isinstance(data, dict):
            # Check common token keys
            for key in ["token", "access_token", "jwt", "session_token", "accessToken"]:
                if key in data and isinstance(data[key], str):
                    return data[key]
            # Check nested user/session object
            for parent in ["session", "data", "auth", "user"]:
                if parent in data and isinstance(data[parent], dict):
                    for key in ["token", "access_token", "jwt"]:
                        if key in data[parent] and isinstance(data[parent][key], str):
                            return data[parent][key]
    except Exception:
        pass

    # Check cookies
    cookies = res.headers.get_list("set-cookie")
    for c in cookies:
        if any(k in c.lower() for k in ["session", "jwt", "token", "auth"]):
            return c.split(";")[0]

    return None

async def bootstrap_test_accounts(target_url: str, client: httpx.AsyncClient) -> Tuple[Optional[Dict[str, str]], Optional[Dict[str, str]]]:
    """
    Autonomously attempts to register two ephemeral test accounts in staging:
    User A (qa_auditor_a) and User B (qa_auditor_b).
    Returns (headers_a, headers_b) or (None, None) if self-registration is unavailable.
    """
    base_url = target_url.rstrip("/")
    random_suffix = str(uuid.uuid4())[:6]

    users_to_create = [
        {"username": f"qa_bot_a_{random_suffix}", "email": f"qa_a_{random_suffix}@redteam-test.local", "password": "QA_Test_Password_123!"},
        {"username": f"qa_bot_b_{random_suffix}", "email": f"qa_b_{random_suffix}@redteam-test.local", "password": "QA_Test_Password_123!"}
    ]

    tokens = []

    for ep in REGISTRATION_ENDPOINTS:
        target_ep = urljoin(base_url, ep)
        for user_payload in users_to_create:
            try:
                # Try standard JSON signup payload
                payload = {
                    "username": user_payload["username"],
                    "email": user_payload["email"],
                    "password": user_payload["password"],
                    "name": "QA Test Bot"
                }
                res = await client.post(target_ep, json=payload, timeout=6.0)
                if res.status_code in [200, 201]:
                    token = extract_token_from_response(res)
                    if token:
                        auth_header = token if token.startswith("Bearer ") else (f"Bearer {token}" if not token.startswith("session=") else token)
                        tokens.append({"Authorization": auth_header} if not token.startswith("session=") else {"Cookie": token})
            except Exception:
                continue

        if len(tokens) >= 2:
            print(f"[AutoAuth] Successfully bootstrapped 2 test accounts via {target_ep}")
            return tokens[0], tokens[1]
        tokens = []

    return None, None
