from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import BaseModel
from typing import Optional, Dict, Any

vuln_app = FastAPI(
    title="Intentionally Vulnerable Mock QA Benchmark Target",
    description="A local sandbox target to test and verify the RedTeam QA scanner engine."
)

class LoginRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

# Mock database of tenant orders
MOCK_ORDERS = {
    "101": {"id": 101, "tenant": "user_a", "item": "Enterprise Server License", "amount": 4999.00, "customer": "Tenant A Corp"},
    "1042": {"id": 1042, "tenant": "user_a", "item": "Private Encryption Key Vault", "amount": 12500.00, "customer": "Tenant A Corp"},
    "202": {"id": 202, "tenant": "user_b", "item": "Basic Cloud Plan", "amount": 29.00, "customer": "Tenant B Inc"}
}

@vuln_app.get("/")
def home():
    # Intentionally missing HSTS, CSP, and X-Frame-Options
    return {"status": "ok", "app": "Staging Multi-Tenant E-Commerce API v1.3"}

# Vulnerable to unhandled 500 crash on null or unexpected type
@vuln_app.post("/api/auth/login")
def login(req: LoginRequest):
    if req.username is None or req.password is None:
        raise Exception("NullPointer / Unhandled KeyError in authentication handler")
    if req.username == "admin" and req.password == "admin123":
        return {"token": "mock_jwt_token_sample", "user": {"id": 1, "role": "admin"}}
    return Response(content='{"error": "Invalid credentials"}', status_code=401, media_type="application/json")

# Vulnerable to Broken Object Level Authorization (BOLA / IDOR):
# Fails to verify if the requesting user/token actually owns the requested order_id!
@vuln_app.get("/api/orders/{order_id}")
def get_order(order_id: str, authorization: Optional[str] = Header(None)):
    if order_id in MOCK_ORDERS:
        return MOCK_ORDERS[order_id]
    return Response(content='{"error": "Order not found"}', status_code=404, media_type="application/json")

@vuln_app.get("/api/orders")
def list_orders(authorization: Optional[str] = Header(None)):
    # Returns tenant A orders by default
    return [MOCK_ORDERS["101"], MOCK_ORDERS["1042"]]

# Sensitive user data endpoint
@vuln_app.get("/api/user")
def get_user():
    return {
        "id": 1042,
        "email": "tenant_a_admin@company.com",
        "ssn": "987-65-4321",
        "api_key": "sk_live_secret_api_key_sample"
    }

# Permissive CORS endpoint
@vuln_app.options("/api/search")
def search_options(response: Response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    return {}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("vuln_app:vuln_app", host="127.0.0.1", port=5000, reload=True)
