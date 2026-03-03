# AlphaPro Deployment Task Plan

## 1. Analysis Summary

### Application Overview
- **AlphaPro** is a MEV/Arbitrage trading engine
- **Components**:
  - API (Node.js/Express) - default port 3000
  - Brain (Python/Flask) - default port 5000
  - Frontend (React) - built and served by API
- **Trading Modes**: LIVE, PAPER, MONITORING
- **Features**:
  - Multi-chain support (Ethereum, Arbitrum, Optimism, Base, Polygon, etc.)
  - 16 trading strategies (Flash Loan, Cross-Chain Arbitrage, Sandwich Attack, etc.)
  - Pre-warmed execution cores for <100ms latency
  - Real-time mempool monitoring
  - AI optimization and ranking engines

### Existing Infrastructure
- **Dockerfile**: Multi-stage build (client + API)
- **docker-compose.yml**: Single instance deployment
- **docker-compose-multi.yml**: 10-instance deployment
- **start-multi-instance.js**: Node.js script to run 10 instances
- **monitor-performance.js**: Real-time monitoring of all instances
- **test_latency.js**: Latency testing tool

### Port Configuration for 10 Instances
| Instance | API Port | Brain Port |
|----------|----------|------------|
| 1        | 3001     | 5001       |
| 2        | 3002     | 5002       |
| 3        | 3003     | 5003       |
| 4        | 3004     | 5004       |
| 5        | 3005     | 5005       |
| 6        | 3006     | 5006       |
| 7        | 3007     | 5007       |
| 8        | 3008     | 5008       |
| 9        | 3009     | 5009       |
| 10       | 3010     | 5010       |

## 2. Plan

### Phase 1: Kill Existing Processes on Target Ports
- [ ] Kill any processes running on ports 3001-3010
- [ ] Kill any processes running on ports 5001-5010
- [ ] Verify ports are free

### Phase 2: Verify/Update Docker Configuration
- [ ] Check existing Dockerfile is complete
- [ ] Check docker-compose-multi.yml configuration
- [ ] Ensure .env file exists (required for API)
- [ ] Build Docker images if needed

### Phase 3: Deploy 10 Instances
- [ ] Option A: Use Docker Compose (docker-compose-multi.yml)
- [ ] Option B: Use Node.js script (start-multi-instance.js)
- [ ] Start all 10 instances

### Phase 4: Verify Running Status
- [ ] Check all 10 API instances are responding (ports 3001-3010)
- [ ] Check all 10 Brain instances are responding (ports 5001-5010)
- [ ] Verify health endpoints

### Phase 5: Verify Profit Generation & Latency
- [ ] Check /api/engine/stats endpoint for profit data
- [ ] Test latency < 100ms using test_latency.js
- [ ] Run monitor-performance.js to verify KPIs

## 3. Implementation Details

### Commands to Execute

#### Kill existing processes (Windows)
```
batch
for /L %i in (3001,1,3010) do netstat -ano | findstr :%i | for /F "tokens=5" %j in ('more') do taskkill /F /PID %j
for /L %i in (5001,1,5010) do netstat -ano | findstr :%i | for /F "tokens=5" %j in ('more') do taskkill /F /PID %j
```

#### Docker Deployment
```
bash
cd AlphaPro
docker-compose -f docker-compose-multi.yml up -d
```

#### Node.js Deployment
```
bash
cd AlphaPro
node start-multi-instance.js
```

#### Verification
```
bash
# Test API health
for /L %i in (3001,1,3010) do curl http://localhost:%i/api/health

# Test latency
node alphapro-api/test_latency.js

# Run monitor
node monitor-performance.js
```

## 4. Expected Results

- All 10 instances running on ports 3001-3010 and 5001-5010
- Health checks passing
- Profit being generated (simulated in PAPER/LIVE mode)
- Latency < 100ms for execution
- System health score > 80%
