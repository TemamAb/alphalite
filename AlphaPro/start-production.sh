#!/bin/bash
# AlphaPro Multi-Instance Production Startup Script
# Starts 10 parallel instances for fault tolerance

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     ALPHAPRO 10-INSTANCE PRODUCTION DEPLOYMENT            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Kill any existing processes on target ports
echo "[1/4] Cleaning up existing processes..."
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010; do
    fuser -k ${port}/tcp 2>/dev/null || true
done

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    exit 1
fi

echo "[2/4] Starting AlphaPro instances..."

# Start 10 instances
for i in {1..10}; do
    port=$((3000 + i))
    brainPort=$((5000 + i))
    
    echo "   Starting instance $i on port $port..."
    
    # Start API in background
    PORT=$port BRAIN_PORT=$brainPort INSTANCE_ID=alphapro-$i TRADING_MODE=LIVE node alphapro-api/app.js > logs/alphapro-$i.log 2>&1 &
    
    # Start Brain in background
    PORT=$brainPort BRAIN_PORT=$brainPort node alphapro-brain/app.py > logs/brain-$i.log 2>&1 &
done

echo "[3/4] Waiting for instances to start..."
sleep 5

echo "[4/4] Verifying instances..."
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010; do
    if curl -s http://localhost:${port}/api/health > /dev/null 2>&1; then
        echo "   ✓ Instance on port $port is RUNNING"
    else
        echo "   ✗ Instance on port $port failed to start"
    fi
done

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  DEPLOYMENT COMPLETE - 10 INSTANCES RUNNING              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Access URLs:"
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010; do
    echo "   http://localhost:$port"
done
echo ""
echo "Monitoring: tail -f logs/alphapro-*.log"
echo "Stop all:  pkill -f 'node alphapro-api/app.js'"
