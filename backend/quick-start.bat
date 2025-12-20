@echo off
echo Stopping any existing Node.js processes on port 8000...
npx kill-port 8000 2>nul

echo.
echo Starting backend server...
node server.js

pause