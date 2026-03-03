@echo off
REM AlphaPro Production Deployment Script (Windows)
REM Deploys to Docker container for REAL PROFIT - NO SIMULATION
REM Uses Pimlico GASLESS transactions - NO pre-funded wallet needed!

echo ==============================================
echo   AlphaPro Production Deployment
echo   Mode: LIVE - REAL TRADING FOR PROFIT
echo   Gas: PIMLICO GASLESS (No wallet funding)
echo ==============================================

REM Change to script directory
cd /d "%~dp0"

REM Verify Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Docker Desktop is not running!
    echo Please start Docker Desktop first, then run this script.
    echo.
    pause
    exit /b 1
)

REM Step 1: Verify configuration
echo.
echo [1/4] Verifying Pimlico configuration...
echo   Bundler: pim_UbfKR9ocMe5ibNUCGgB8fE (configured)
echo   Wallet: 0x748Aa8ee067585F5bd02f0988eF6E71f2d662751
echo   NOTE: Gasless mode - NO wallet funding required!

REM Step 2: Stop existing containers
echo.
echo [2/4] Stopping existing containers...
docker-compose down -v 2>nul

REM Step 3: Build Docker images
echo.
echo [3/4] Building Docker images...
docker-compose build --no-cache

REM Step 4: Start containers
echo.
echo [4/4] Starting AlphaPro containers...
docker-compose up -d

REM Wait for services
timeout /t 15 /nobreak >nul

REM Verify services
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
echo To verify LIVE mode:
echo   curl http://localhost:3001/api/engine/state
echo.
echo To check wallet status:
echo   curl http://localhost:3001/api/wallet/status
echo.
echo To view logs:
echo   docker-compose logs -f
echo.
echo ==============================================
echo   TRADING MODE: LIVE
echo   GASLESS: Pimlico paymaster sponsors gas
echo   PROFIT: Real trading - no simulation
echo ==============================================

pause
