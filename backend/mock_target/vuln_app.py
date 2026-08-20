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

@vuln_app.get("/")
def home():
    # Intentionally missing HSTS, CSP, and X-Frame-Options
    return {"status": "ok", "app": "Staging E-Commerce API v1.2"}

# Vulnerable to unhandled 500 crash on null or unexpected type
@vuln_app.post("/api/auth/login")
def login(req: LoginRequest):
    if req.username is None or req.password is None:
        # Intentionally raises unhandled 500 exception
        raise Exception("NullPointer / Unhandled KeyError in authentication handler")
    if req.username == "admin" and req.password == "admin123":
        return {"token": "mock_jwt_token_sample", "user": {"id": 1, "role": "admin"}}
    return Response(content='{"error": "Invalid credentials"}', status_code=401, media_type="application/json")

# Vulnerable to Broken Object Level Authorization (IDOR) & missing auth
@vuln_app.get("/api/user")
def get_user():
    return {
        "id": 1042,
        "email": "customer@company.com",
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
