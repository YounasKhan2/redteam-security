@echo off
setlocal
cd /d "%~dp0"
echo ========================================================
echo Starting RedTeam Adversarial QA Backend on http://127.0.0.1:8000
echo ========================================================

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
