@echo off
echo === Plagiarism Control Backend Server ===
echo.

cd /d "%~dp0"

echo Checking Python installation...
python --version
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Installing/Updating dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo Error installing dependencies. Trying alternative method...
    pip install uvicorn fastapi motor python-dotenv bcrypt python-jose scikit-learn pandas numpy nbformat
)

echo.
echo Starting FastAPI server...
echo Server will be available at: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo Press Ctrl+C to stop the server
echo.

python -m uvicorn server:app --reload --host 127.0.0.1 --port 8000

if errorlevel 1 (
    echo.
    echo Uvicorn failed. Trying alternative startup method...
    python start_server.py
)

pause