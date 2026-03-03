@echo off
REM AlphaPro Local Production Deployment - NO DOCKER NEEDED
REM Runs directly with Node.js for REAL PROFIT

echo ==============================================
echo   AlphaPro Production Deployment
echo   Mode: LIVE - REAL TRADING FOR PROFIT
echo   Gas: PIMLICO GASLESS
echo ==============================================

cd /d "%~dp0"

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo.
echo [1/3] Starting AlphaPro Brain (Python)...
start "AlphaPro-Brain" cmd /k "cd alphapro-brain && pip install -r requirements.txt >nul 2>&1 && python app.py"

echo [2/3] Starting AlphaPro API (Node.js)...
start "AlphaPro-API" cmd /k "cd alphapro-api && set TRADING_MODE=LIVE&& set NODE_ENV=production&& node app.js"

echo [3/3] Waiting for services to start...
timeout /t 8 /nobreak >nul

echo.
echo ==============================================
echo   Deployment Complete!
echo ==============================================
echo.
echo Services:
echo   - API:       http://localhost:3001
echo   - Brain:     http://localhost:5001
echo   - Dashboard: http://localhost:3001
echo.
echo To verify:
echo   curl http://localhost:3001/api/health
echo   curl http://localhost:3001/api/engine/state
echo.
echo ==============================================
echo   TRADING MODE: LIVE
echo   PROFIT: Real trading - no simulation
echo ==============================================

pause
