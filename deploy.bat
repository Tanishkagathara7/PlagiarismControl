@echo off
echo ========================================
echo   Plagiarism Control - Deployment Setup
echo ========================================
echo.

echo This script will help you prepare for cloud deployment.
echo.

echo Step 1: Checking if Git is initialized...
if exist ".git" (
    echo ✓ Git repository found
) else (
    echo Initializing Git repository...
    git init
    echo ✓ Git initialized
)

echo.
echo Step 2: Adding files to Git...
git add .
git status

echo.
echo Step 3: Committing changes...
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Prepare for cloud deployment

git commit -m "%commit_msg%"

echo.
echo ========================================
echo   Next Steps for Cloud Deployment:
echo ========================================
echo.
echo 1. Create a GitHub repository
echo 2. Push your code:
echo    git remote add origin https://github.com/YOUR_USERNAME/plagiarism-control.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. Deploy Backend to Railway:
echo    - Go to https://railway.app
echo    - Create new project from GitHub repo
echo    - Set root directory to 'backend'
echo    - Add environment variables from backend/.env
echo.
echo 4. Deploy Frontend to Vercel:
echo    - Go to https://vercel.com
echo    - Create new project from GitHub repo
echo    - Set root directory to 'frontend'
echo    - Add REACT_APP_BACKEND_URL environment variable
echo.
echo 5. Test your live application!
echo.
echo For detailed instructions, see DEPLOYMENT_GUIDE.md
echo.
pause