# AlphaPro Production Deployment Plan
## Live Profit Generation Architecture

---

## 1. Executive Summary

This document outlines the complete implementation plan for deploying AlphaPro to production on local Docker infrastructure with cloud-grade capabilities for generating real profit. The architecture supports:
- **Live Trading Mode**: Real funds, real execution via Pimlico gasless transactions
- **Sub-100ms Latency**: Pre-warmed providers, hot-path optimization
- **Multi-Chain Support**: Ethereum, Arbitrum, Optimism, Polygon, Base, BSC, Avalanche
- **Enterprise Profit Engine**: 16 arbitrage strategies with auto-selection

### Current System Status

| Component | Status | Mode |
|-----------|--------|------|
| EnterpriseProfitEngine | ✅ Active | LIVE |
| DataFusionEngine | ✅ Active | LIVE |
| RankingEngine | ✅ Active | LIVE |
| Brain Service (AI) | ✅ Running | Production |
| Frontend Dashboard | ✅ Running | Production |
| Docker Containers | ✅ Ready | Production |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ALPHAPRO PRODUCTION ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                     │
│   │   Browser    │    │   Browser    │    │   Browser    │                     │
│   │  Dashboard  │    │  Monitoring  │    │  Analytics   │                     │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                     │
│          │                   │                   │                             │
│          └───────────────────┼───────────────────┘                             │
│                              │                                                 │
│                      ┌───────▼────────┐                                        │
│                      │  API Gateway   │                                        │
│                      │   :3000        │                                        │
│                      └───────┬────────┘                                        │
│                              │                                                 │
│      ┌───────────────────────┼───────────────────────┐                          │
│      │                       │                       │                          │
│ ┌────▼─────┐         ┌──────▼──────┐        ┌──────▼──────┐                  │
│ │ Enterprise│         │ DataFusion  │        │   Brain     │                  │
│ │ Profit   │◄────────│   Engine    │────────│  (Python)   │                  │
│ │ Engine   │         │              │        │   :5000     │                  │
│ └────┬─────┘         └──────┬───────┘        └─────────────┘                  │
│      │                      │                                                 │
│      │              ┌───────▼────────┐                                        │
│      │              │  Ranking       │                                        │
│      │              │  Engine        │                                        │
│      │              └───────┬────────┘                                        │
│      │                      │                                                 │
│      │        ┌──────────────┼──────────────┐                                 │
│      │        │              │              │                                 │
│ ┌────▼───┐ ┌──▼────┐  ┌─────▼─────┐  ┌─────▼──────┐                          │
│ │Sentinel│ │  MEV  │  │  Trade    │  │  Redis     │                          │
│ │ Agent  │ │Engine │  │  Database │  │  (Pub/Sub) │                          │
│ └────────┘ └───────┘  └───────────┘  └────────────┘                          │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐│
│ │                        BLOCKCHAIN LAYER                                     ││
│ │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   ││
│ │  │Ethereum │ │Arbitrum │ │Optimism │ │ Polygon │ │  Base   │ │   BSC   │   ││
│ │  │ Mainnet │ │ Mainnet │ │ Mainnet │ │ Mainnet │ │ Mainnet │ │Mainnet  │   ││
│ │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   ││
│ │       │           │           │           │           │           │        ││
│ │  ┌────▼──────────▼──────────▼──────────▼──────────▼──────────▼────┐       ││
│ │  │              PIMLICO GASLESS EXECUTION LAYER                   │       ││
│ │  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐    │       ││
│ │  │  │  Bundler    │  │  Paymaster   │  │  Smart Wallet     │    │       ││
│ │  │  │  (UserOp)   │  │  (Gasless)   │  │  (Account Abst.) │    │       ││
│ │  │  └─────────────┘  └──────────────┘  └────────────────────┘    │       ││
│ │  └───────────────────────────────────────────────────────────────┘       ││
│ └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Production Requirements Checklist

### 3.1 Environment Variables (Required for Live Trading)

Create `.env` file in `AlphaPro/` directory:

```bash
# ===================================================================
# CRITICAL: PRIVATE KEY - WALLET MUST BE FUNDED WITH MINIMUM 0.01 ETH
# ===================================================================
PRIVATE_KEY=0x_your_private_key_here

# Wallet Address (Smart Wallet for gasless transactions)
WALLET_ADDRESS=0x21e6d55cBd4721996a6B483079449cFc279A993a

# ===================================================================
# TRADING MODE - MUST BE "LIVE" FOR REAL PROFIT
# ===================================================================
TRADING_MODE=LIVE
NODE_ENV=production

# ===================================================================
# PIMLICO GASLESS TRANSACTION CONFIGURATION
# ===================================================================
PIMLICO_API_KEY=pim_UbfKR9ocMe5ibNUCGgB8fE
BUNDLER_URL=https://api.pimlico.io/v1/1/rpc?apikey=pim_UbfKR9ocMe5ibNUCGgB8fE
PAYMASTER_URL=https://api.pimlico.io/v2/1/rpc?apikey=pim_UbfKR9ocMe5ibNUCGgB8fE
ENTRYPOINT_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789

# ===================================================================
# BLOCKCHAIN RPC ENDPOINTS (High-Speed)
# ===================================================================
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mK2nj6ZSi1mZ2THJMUHcF
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/mK2nj6ZSi1mZ2THJMUHcF
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/mK2nj6ZSi1mZ2THJMUHcF
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/mK2nj6ZSi1mZ2THJMUHcF
BASE_RPC_URL=https://base.llamarpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org

# ===================================================================
# WEBSOCKET FOR REAL-TIME MEMPOOL (Sub-200ms)
# ===================================================================
ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mK2nj6ZSi1mZ2THJMUHcF

# ===================================================================
# DATABASE (Optional - Falls back to in-memory)
# ===================================================================
DATABASE_URL=postgresql://user:password@localhost:5432/alphapro
REDIS_URL=redis://localhost:6379

# ===================================================================
# SECURITY
# ===================================================================
ADMIN_API_KEY=alphapro-prod-key-2024
JWT_SECRET=alphapro_jwt_secret_prod_2024
```

### 3.2 Wallet Requirements

| Requirement | Value | Purpose |
|-------------|-------|---------|
| Minimum Balance | 0.01 ETH | Smart wallet deployment |
| Network | Ethereum Mainnet | Primary execution chain |
| Wallet Type | Smart Contract (Account Abstraction) | Gasless transactions via Pimlico |

### 3.3 Infrastructure Requirements

| Service | Port | Required | Fallback |
|---------|------|----------|----------|
| AlphaPro API | 3001 | Yes | Built-in |
| AlphaPro Brain | 5001 | Yes | Built-in |
| PostgreSQL | 5432 | No | In-Memory |
| Redis | 6379 | No | In-Memory |

---

## 4. Local Docker Deployment Steps

### 4.1 Prerequisites

```bash
# Install Docker Desktop on Windows
# Download from: https://www.docker.com/products/docker-desktop

# Verify Docker installation
docker --version
docker-compose --version
```

### 4.2 Deployment Commands

```bash
# Navigate to AlphaPro directory
cd AlphaPro

# Step 1: Create .env file with your configuration
# (See section 3.1 above)

# Step 2: Build and start all services
docker-compose up --build -d

# Step 3: Verify all containers are running
docker ps

# Step 4: Check logs
docker-compose logs -f

# Step 5: Verify health
curl http://localhost:3001/api/health
```

### 4.3 Docker Compose Configuration

The `docker-compose.yml` includes:

1. **alphapro-api** (Port 3001)
   - Node.js Express server
   - React frontend built-in
   - Trading engine auto-starts in LIVE mode

2. **alphapro-brain** (Port 5001)
   - Python AI service
   - Strategy optimization
   - Market analysis

---

## 5. Pilot Testing Protocol

### 5.1 Pre-Flight Checks

Before starting live trading, verify:

```bash
# 1. Check health endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/preflight

# 2. Verify trading mode is LIVE
curl http://localhost:3001/api/engine/state

# 3. Check wallet configuration
curl http://localhost:3001/api/wallet/status
```

### 5.2 Pilot Test Execution

#### Phase 1: Observation Mode (5 minutes)
- Engine monitors mempool in LIVE mode
- Logs show detected opportunities
- No actual trades executed (wallet address valid but unfunded)

#### Phase 2: Micro-Trade Test (10 minutes)
- Fund wallet with 0.02 ETH minimum
- Enable micro-trade execution
- Execute 1-5 small trades ($10-50)
- Verify transaction success

#### Phase 3: Full Production (Continuous)
- Monitor profit/loss dashboard
- Review trade database logs
- Adjust risk parameters as needed

### 5.3 Monitoring Dashboard

Access at: http://localhost:3001

| Metric | Endpoint | Description |
|--------|----------|-------------|
| Total Trades | `/api/engine/stats` | Number of executed trades |
| Total Profit | `/api/engine/stats` | Cumulative profit in ETH |
| Active Opportunities | `/api/rankings/opportunities` | Current best opportunities |
| Mempool Status | `/api/mempool/status` | Real-time pending transactions |
| Wallet Balance | `/api/wallet/balance` | Current ETH balance |

---

## 6. Production Risk Management

### 6.1 Built-in Safeguards

| Protection | Value | Description |
|------------|-------|-------------|
| Max Concurrent Executions | 5 | Simultaneous trade limit |
| Min Opportunity Size | 100 USD | Minimum profit threshold |
| Max Position Size | 10,000 USD | Single trade limit |
| Stop Loss | 5% | Auto-stop on losses |

### 6.2 Strategy Selection

The engine automatically selects the best strategy based on opportunity size:

| Opportunity Size | Strategy |
|-----------------|----------|
| > $55,000 | Flash Loan |
| > $48,000 | Cross-Chain Arbitrage |
| > $42,000 | Sandwich Attack |
| > $38,000 | MEV Extract |
| > $32,000 | Liquidations |
| > $26,000 | Volatility Arbitrage |
| > $22,000 | JIT Liquidity |
| > $18,000 | Cross-DEX |
| > $14,000 | Spatial Arbitrage |
| > $10,000 | Funding Rate Arbitrage |
| > $7,000 | Dex Aggregator |
| > $5,000 | Statistical Arbitrage |
| > $3,000 | Triangular |
| > $1,500 | Basis Trading |
| > $500 | Index Rebalance |
| < $500 | LVR |

---

## 7. Cloud Migration Path

### 7.1 Phase 1: Local Production (Current)
- Docker on local machine
- Real trading with local execution

### 7.2 Phase 2: Cloud Deployment Options

| Platform | Configuration | Monthly Cost |
|----------|---------------|--------------|
| **Render.com** | Standard plan + Python service | ~$50/mo |
| **Railway** | Pro plan with Redis | ~$40/mo |
| **AWS EC2** | t3.large instance | ~$80/mo |
| **DigitalOcean** | Premium droplet | ~$60/mo |

### 7.3 Render.com Deployment

The included `render.yaml` supports one-click deployment:

1. Push code to GitHub
2. Connect repository to Render
3. Set environment variables in Render dashboard
4. Deploy with one click

---

## 8. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "MONITORING mode" in logs | Add PRIVATE_KEY to .env |
| "UserOp Client init failed" | Verify PIMLICO_API_KEY |
| "RPC provider not found" | Check ETH_RPC_URL |
| Wallet not funded | Send minimum 0.01 ETH to WALLET_ADDRESS |
| Port 3001 already in use | Change port in .env or stop conflicting service |

### Debug Commands

```bash
# Check container status
docker ps

# View live logs
docker-compose logs -f alphapro-api

# Restart services
docker-compose restart

# Rebuild after changes
docker-compose up --build --force-recreate
```

---

## 9. Security Considerations

### 9.1 Production Best Practices

1. **Never commit `.env` to version control**
2. **Rotate API keys regularly**
3. **Use separate wallets for trading**
4. **Monitor wallet balance continuously**
5. **Set up alerts for unusual activity**

### 9.2 Network Security

- All RPC endpoints use HTTPS/WSS
- Redis/PostgreSQL on internal network only
- Admin API key protects sensitive endpoints

---

## 10. Success Metrics

### Pilot Test KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Trade Execution Rate | 1-5 trades/hour | /api/engine/stats |
| Average Profit per Trade | > $10 | Dashboard |
| Latency (E2E) | < 200ms | Logs |
| Success Rate | > 90% | Trade database |
| Daily Profit | > $50 | Dashboard |

### Production Goals

| Metric | 30-Day Target |
|--------|---------------|
| Total Profit | > $5,000 |
| Win Rate | > 85% |
| Average Trade | > $100 |
| Downtime | < 1% |

---

## 11. Quick Start Commands

```bash
# Complete setup in 5 minutes
cd AlphaPro

# 1. Create .env
echo "PRIVATE_KEY=0x..." > .env
echo "TRADING_MODE=LIVE" >> .env

# 2. Start Docker
docker-compose up --build -d

# 3. Verify
curl http://localhost:3001/api/health

# 4. Check mode
curl http://localhost:3001/api/engine/state

# 5. Monitor
docker-compose logs -f
```

---

## Appendix: API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System health check |
| `/api/preflight` | GET | Pre-flight checks |
| `/api/engine/state` | GET | Current trading mode |
| `/api/engine/state` | POST | Change trading mode |
| `/api/engine/stats` | GET | Trading statistics |
| `/api/engine/execute` | POST | Manual trade execution |
| `/api/rankings/opportunities` | GET | Current opportunities |
| `/api/rankings/chains` | GET | Chain rankings |
| `/api/wallet/status` | GET | Wallet configuration |
| `/api/wallet/balance` | GET | Current balance |
| `/api/trades` | GET | Trade history |
| `/api/agents/status` | GET | Agent status |

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-03  
**Classification:** Production Deployment Guide
