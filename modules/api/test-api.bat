@echo off
REM AlphaPro API Test Script for Windows
REM Run this to install dependencies and test the API

echo ==========================================
echo AlphaPro API - Install ^& Test
echo ==========================================

cd /d "%~dp0"

echo [1/4] Installing npm dependencies...
call npm install

echo [2/4] Generating Prisma client...
call npx prisma generate

echo [3/4] Starting API server...
start "AlphaPro API" cmd /k "npm start"

echo [4/4] Waiting for server to start...
timeout /t 5 /nobreak > nul

echo.
echo ==========================================
echo Testing Endpoints
echo ==========================================

echo.
echo Testing /api/health...
curl -s http://localhost:3000/api/health

echo.
echo.
echo Testing /metrics...
curl -s http://localhost:3000/metrics

echo.
echo.
echo ==========================================
echo Server running on port 3000
echo ==========================================
pause
