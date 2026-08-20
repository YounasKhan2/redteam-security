#!/usr/bin/env bash
cd "$(dirname "$0")"
echo "Starting RedTeam Adversarial QA Backend on http://127.0.0.1:8000"
exec python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
