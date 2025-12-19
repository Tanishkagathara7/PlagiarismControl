@echo off
echo Starting Plagiarism Control Project...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0backend && python -m uvicorn server:app --reload --host 127.0.0.1 --port 8000"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo Both servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
pause