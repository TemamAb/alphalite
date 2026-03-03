# AlphaPro Production Deployment Implementation Plan

## Executive Summary

This document outlines the complete implementation plan for deploying AlphaPro to production, running real profit-generating trades from local Docker containers, and eventually launching to official cloud platforms.

---

## Current Status

### ✅ Completed
1. **Docker Images Built**: 10 API containers + 10 Brain containers ready
2. **Smart Wallet Integration**: Fixed ERC-4337 (Pimlico v2) integration
3. **Dashboard Built**: Vite-based dashboard compiled into containers
4. **Configuration Fixed**: Module paths, API endpoints corrected
5. **Safety Mode**: WITHDRAWAL_MODE set to MANUAL

### ⏳ Pending
1. Start the Docker containers
2. Verify smart wallet initialization
3. Execute pilot trades
4. Monitor profit generation
5. Deploy to cloud platforms

---

## Phase 1: Local Docker Deployment (Pilot Test)

### Step 1.1: Start Containers
```bash
cd AlphaPro
docker-compose -f docker-compose-multi.yml up -d
```

### Step 1.2: Verify Containers Running
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected output:
- alphapro-api-1 through alphapro-api-10 on ports 3001-3010
- alphapro-brain-1 through alphapro-brain-10 on ports 5001-5010

### Step 1.3: Check Container Logs
```bash
docker logs alphapro-api-1
```

Look for:
- ✅ "Smart Wallet initialized successfully"
- ✅ "Connected to Pimlico ERC-4337"
- ✅ "Ready to execute trades"

### Step 1.4: Access Dashboard
Open browser to: http://localhost:3001

---

## Phase 2: Smart Wallet Configuration

### Understanding ERC-4337 Smart Wallets

AlphaPro uses **Pimlico ERC-4337** smart wallets for gasless transactions:
- **No prefunding required**: Paymaster covers gas fees
- **Smart wallet created on first transaction**: No manual wallet setup needed
- **Automatic gas sponsorship**: Trades execute without ETH balance

### How It Works

1. **First Trade Flow**:
   - AlphaPro prepares a UserOperation
   - Pimlico paymaster sponsors the gas
   - Bundler includes the transaction
   - Smart wallet created automatically if not exists

2. **Subsequent Trades**:
   - Same gasless execution
   - Smart wallet already deployed
   - Faster execution

---

## Phase 3: Pilot Trading Execution

### Step 3.1: Initial Trade Test
Send a small test trade to verify:
- Smart wallet creation works
- Gas sponsorship functions
- RPC connections stable

### Step 3.2: Monitor Performance
Key metrics to track:
- **Execution Latency**: Target < 100ms
- **Success Rate**: Target > 95%
- **Profit/Loss**: Real-time tracking

### Step 3.3: Scale Up
Once pilot is successful:
- Enable all 10 instances
- Increase trade size gradually
- Monitor for any issues

---

## Phase 4: Cloud Deployment

### Option A: Render.com (Already Configured)
The `render.yaml` file is ready for deployment:
```bash
render blueprint deploy
```

### Option B: AWS ECS
```bash
aws ecs create-cluster --cluster-name alphapro-prod
```

### Option C: Google Cloud Run
```bash
gcloud run deploy alphapro-api --source .
```

### Option D: DigitalOcean App Platform
```bash
doctl apps create --spec render.yaml
```

---

## Configuration Reference

### Environment Variables (.env)

| Variable | Value | Description |
|----------|-------|-------------|
| TRADING_MODE | LIVE | Enable real trading |
| WITHDRAWAL_MODE | MANUAL | Safety: manual withdrawals |
| PIMLICO_API_KEY | pim_7U8edDUxoBDSKCUL8j8Tm7 | Gas sponsorship |
| BUNDLER_URL | https://api.pimlico.io/v1/1/rpc | ERC-4337 bundler |
| PAYMASTER_URL | https://api.pimlico.io/v1/1/rpc | Gas paymaster |

### Port Mapping

| Service | Local Port | Container Port |
|---------|------------|-----------------|
| API Instance 1 | 3001 | 3000 |
| API Instance 2 | 3002 | 3000 |
| ... | ... | ... |
| API Instance 10 | 3010 | 3000 |
| Brain Instance 1 | 5001 | 5000 |
| ... | ... | ... |
| Brain Instance 10 | 5010 | 5000 |

---

## Troubleshooting

### Issue: Smart Wallet Validation Error
**Solution**: Already fixed in build - containers use fallback initialization

### Issue: Containers Won't Start
**Check**:
```bash
docker logs alphapro-api-1
```

### Issue: No Profit Generated
**Check**:
1. RPC connections: `curl http://localhost:3001/api/health`
2. Smart wallet status: Check logs for "Smart Wallet address"
3. Trade database: Check if trades are being recorded

---

## Security Considerations

1. **Withdrawal Mode**: MANUAL - requires manual approval
2. **Gas Limits**: Configured per trade type
3. **Max Slippage**: Protected in trade execution
4. **Emergency Stop**: Available via API endpoint

---

## Next Steps

1. **Approve container startup**: Run `docker-compose up -d`
2. **Verify initialization**: Check logs for smart wallet creation
3. **Execute pilot trade**: Send small test transaction
4. **Monitor profit**: Watch dashboard for P&L
5. **Scale up**: Enable all 10 instances

---

## Contact & Support

For issues or questions:
- Check container logs: `docker logs <container-name>`
- Dashboard: http://localhost:3001 (or respective port)
- API Health: http://localhost:3001/api/health
