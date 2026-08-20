# 🛡️ RedTeam — Autonomous Adversarial QA & Security Testing Platform

An AI-powered continuous security testing platform designed for QA teams, developers, and security engineers to discover and fix vulnerabilities in staging environments before production releases.

## 📁 Repository Architecture

```
RedTeam/
├── backend/                  # FastAPI + Python Active Scanner Engine
│   ├── scanner/              # Active DAST, Crawler, SQLi, SSRF, Auth, Rate Limiting
│   ├── mock_target/          # Local vulnerable testbed benchmark application
│   ├── main.py               # REST API & Server-Sent Events (SSE) stream
│   └── requirements.txt
└── frontend/                 # React 19 + Vite + Tailwind CSS Dashboard
    ├── src/                  # Dashboard, Scans, Findings, and Live Terminal Feed
    └── package.json
```

## 🚀 Quickstart Guide

### 1. Backend Setup (FastAPI & Scanner)
```bash
cd backend
pip install -r requirements.txt
# Configure backend/.env with your Supabase credentials
run_backend.bat
```
*Backend runs on `http://127.0.0.1:8000`*

### 2. Frontend Setup (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

### 3. (Optional) Start Local Benchmark Target
```bash
cd backend/mock_target
python vuln_app.py
```
*Vulnerable test target runs on `http://127.0.0.1:5000`*
