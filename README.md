# AlphaPro — Enterprise Flash Loan & MEV Arbitrage System

> **Status:** 🟢 LIVE | Flash Loan Engine | Multi-Chain DEX Arbitrage | ERC-4337 Gasless

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/TemamAb/alphalite)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  AlphaPro System (3 Services)                │
├──────────────────┬──────────────────┬───────────────────────┤
│  Engine (Node.js)│  Brain (Python)  │  Dashboard (React)    │
│  Port 3000/10000 │  Port 5000       │  Port 8080/80         │
│  ─────────────── │  ─────────────── │  ──────────────────── │
│  Flash Loan Exec │  AI Oracle       │  Real-time UI         │
│  MEV Detection   │  Simulated       │  Profit Charts        │
│  ERC-4337 Wallet │  Annealing       │  Strategy Rankings    │
│  RankingEngine   │  Market Regime   │  Blockchain Stream    │
│  WhaleWatcher    │  Competitor Scan │  Alpha Copilot        │
└──────────────────┴──────────────────┴───────────────────────┘
```

## Quick Start — Local Docker

```bash
# 1. Clone the repo
git clone https://github.com/TemamAb/alphalite.git
cd alphalite/AlphaPro

# 2. Copy and configure secrets
cp .env.example .env
# Edit .env with your RPC URLs, PRIVATE_KEY, PIMLICO_API_KEY

# 3. Build and run all 3 services
docker compose up --build

# Services available:
#   Engine API:   http://localhost:3000
#   Python Brain: http://localhost:5000
#   Dashboard:    http://localhost:8080
```

## Prove Profit Generation

```bash
# With engine running (docker compose up), run:
npm run prove
# or
node prove-profit.js
```

This script:
1. Fetches **real-time DEX prices** from CoinGecko
2. Connects to the **live engine API**
3. Calculates **flash loan arbitrage profits** across Uniswap/Curve/Balancer
4. Prints a **full profit report** with projections

## Deploy to Render (Auto-Deploy)

1. **Fork/push this repo to GitHub**
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect your GitHub repo → Render reads `render.yaml` automatically
4. Set the following **Secret Environment Variables** in Render UI:
   - `PRIVATE_KEY` — Your wallet private key
   - `WALLET_ADDRESS` — Your wallet address
   - `PIMLICO_API_KEY` — ERC-4337 gas sponsorship
   - `ETH_RPC_URL`, `POLYGON_RPC_URL`, etc. — Alchemy RPC URLs
   - `JWT_SECRET`, `ENCRYPTION_KEY` — Security keys
5. Click **Deploy** → All 3 services spin up automatically

## Services & Ports

| Service | Local Port | Render URL | Purpose |
|---------|-----------|------------|---------|
| Engine  | 3000      | alphapro-engine.onrender.com | Flash Loan + MEV + REST API |
| Brain   | 5000      | alphapro-brain.onrender.com  | Python AI Oracle |
| Dashboard | 8080    | alphapro-dashboard.onrender.com | React UI |

## API Endpoints

```
GET  /api/health              → System health check
GET  /api/engine/stats        → Profit stats, win rate, trade count
GET  /api/rankings            → DEX/chain rankings
GET  /api/rankings/opportunity → Best live arbitrage opportunity
GET  /api/dashboard           → Full dashboard data bundle
GET  /api/preflight           → Pre-flight connectivity checks
POST /api/engine/state        → Start/pause engine
GET  /api/brain/status        → AI Oracle status
WS   /ws                      → Real-time WebSocket feed
```

## Flash Loan Strategy Stack

| Strategy | Risk | Profit Multiplier |
|----------|------|-------------------|
| Leviathan Aggregation | High | 5.0x |
| Flash Loan | High | 4.5x |
| Cross-Rollup Bridge | High | 2.8x |
| Cross-Chain Arbitrage | High | 2.5x |
| MEV Extract | Medium | 2.2x |
| Sandwich Attack | Medium | 2.0x |
| NFT Floor Arbitrage | Medium | 1.9x |
| JIT Liquidity | Low | 1.6x |
| Cross-DEX | Low | 1.4x |

## Security

- ✅ JWT Authentication on sensitive endpoints
- ✅ Rate limiting (HFT-grade tiered: 1200/min data, 300/min trades, 50/min wallets)
- ✅ Helmet.js security headers
- ✅ Input validation with Joi schemas
- ✅ ERC-4337 gasless transactions via Pimlico
- ✅ Private keys **never committed** (use Render env vars)

---

*AlphaPro v2.0 — Enterprise Grade DeFi Arbitrage*
