#!/bin/bash
# AlphaPro API Test Script
# Run this to install dependencies and test the API

echo "=========================================="
echo "AlphaPro API - Install & Test"
echo "=========================================="

# Navigate to API directory
cd "$(dirname "$0")"

# Install dependencies
echo "[1/4] Installing npm dependencies..."
npm install

# Generate Prisma client
echo "[2/4] Generating Prisma client..."
npx prisma generate

# Start the server in background
echo "[3/4] Starting API server..."
npm start &
SERVER_PID=$!

# Wait for server to start
echo "[4/4] Waiting for server to start..."
sleep 5

# Test endpoints
echo ""
echo "=========================================="
echo "Testing Endpoints"
echo "=========================================="

echo ""
echo "Testing /api/health..."
curl -s http://localhost:3000/api/health

echo ""
echo ""
echo "Testing /metrics..."
curl -s http://localhost:3000/metrics | head -20

echo ""
echo ""
echo "=========================================="
echo "Server running on port 3000"
echo "To stop: kill $SERVER_PID"
echo "=========================================="
