# AlphaPro Docker Deployment Script
# Run this in PowerShell

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  AlphaPro Production Deployment" -ForegroundColor Cyan
Write-Host "  Mode: LIVE - REAL TRADING FOR PROFIT" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to script directory
Set-Location $PSScriptRoot

Write-Host "[1/4] Building Docker images..." -ForegroundColor Yellow
docker compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "[2/4] Starting containers..." -ForegroundColor Yellow
docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start containers!" -ForegroundColor Red
    exit 1
}

Write-Host "[3/4] Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "[4/4] Checking container status..." -ForegroundColor Yellow
docker ps

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Dashboard: http://localhost:3001" -ForegroundColor Cyan
Write-Host "API:      http://localhost:3001/api" -ForegroundColor Cyan
Write-Host "Brain:    http://localhost:5001" -ForegroundColor Cyan
Write-Host ""
Write-Host "To verify LIVE mode:" -ForegroundColor Yellow
Write-Host "  curl http://localhost:3001/api/engine/state" -ForegroundColor White
Write-Host ""

# Test API
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "API is responding!" -ForegroundColor Green
    }
} catch {
    Write-Host "API not responding yet..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "View logs: docker compose logs -f" -ForegroundColor Cyan
