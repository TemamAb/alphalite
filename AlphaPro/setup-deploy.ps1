#!/usr/bin/env pwsh

# AlphaPro Setup and Deploy Script
# Run from the AlphaPro directory

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "AlphaPro GitHub Setup and Deploy Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Git is not installed. Please install Git first." -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Initializing Git repository..." -ForegroundColor Yellow
git init

Write-Host ""
Write-Host "Step 2: Adding all files..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "Step 3: Creating initial commit..." -ForegroundColor Yellow
git commit -m "AlphaPro production deployment with Render configuration"

Write-Host ""
Write-Host "Step 4: Setting up GitHub remote..." -ForegroundColor Yellow
git remote add origin https://github.com/TemamAb/alphalite.git

Write-Host ""
Write-Host "Step 5: Pushing to GitHub..." -ForegroundColor Yellow
git branch -M main
git push -u origin main

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Deployment to GitHub complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://render.com and log in" -ForegroundColor White
Write-Host "2. Connect your GitHub account" -ForegroundColor White
Write-Host "3. Render will auto-detect render.yaml" -ForegroundColor White
Write-Host "4. Add environment variables in Render Dashboard:" -ForegroundColor White
Write-Host "   - WALLET_ADDRESS" -ForegroundColor Gray
Write-Host "   - PRIVATE_KEY" -ForegroundColor Gray
Write-Host "   - PIMLICO_API_KEY" -ForegroundColor Gray
Write-Host "   - ETH_RPC_URL" -ForegroundColor Gray
Write-Host "   - ARBITRUM_RPC_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "Or configure wallet via Dashboard Settings after deployment." -ForegroundColor White
Write-Host ""
