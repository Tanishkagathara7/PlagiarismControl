@echo off
echo Starting Plagiarism Control Application...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0backend && uvicorn server:app --reload --host 0.0.0.0 --port 8000"

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo Both servers are starting...
echo Backend will be available at: http://localhost:8000
echo Frontend will be available at: http://localhost:3000
echo API Documentation: http://localhost:8000/docs
echo.
echo Press any key to exit...
pause > nul