@echo off
REM AlphaPro Setup and Deploy Script
REM Run this script from the AlphaPro directory

echo ============================================
echo AlphaPro GitHub Setup and Deploy Script
echo ============================================

REM Check if git is installed
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git is not installed. Please install Git first.
    exit /b 1
)

echo.
echo Step 1: Initializing Git repository...
git init

echo.
echo Step 2: Adding all files...
git add .

echo.
echo Step 3: Creating initial commit...
git commit -m "AlphaPro production deployment with Render configuration"

echo.
echo Step 4: Setting up GitHub remote...
git remote add origin https://github.com/TemamAb/alphalite.git

echo.
echo Step 5: Pushing to GitHub...
git branch -M main
git push -u origin main

echo.
echo ============================================
echo Deployment to GitHub complete!
echo ============================================
echo.
echo Next steps:
echo 1. Go to https://render.com and log in
echo 2. Connect your GitHub account
echo 3. Render will auto-detect render.yaml
echo 4. Add environment variables in Render Dashboard:
echo    - WALLET_ADDRESS
echo    - PRIVATE_KEY  
echo    - PIMLICO_API_KEY
echo    - ETH_RPC_URL
echo    - ARBITRUM_RPC_URL
echo.
echo Or configure wallet via Dashboard Settings after deployment.
echo.
pause
