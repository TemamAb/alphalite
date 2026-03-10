# AlphaPro Production Deployment Guide

## Status: PRODUCTION READY

This document outlines the steps to deploy AlphaPro for **real trading** (generating actual profit).

---

## Required Environment Variables (Must be set in Render Dashboard)

### Critical for Live Trading

| Variable | Description | Example |
|----------|-------------|---------|
| `PRIVATE_KEY` | Ethereum wallet private key (without 0x prefix) | `abcd1234...` |
| `WALLET_ADDRESS` | Ethereum wallet address | `0x742d35...` |
| `TRADING_MODE` | Set to `LIVE` | `LIVE` |
| `ETH_RPC_URL` | Alchemy/Infura mainnet RPC | `https://eth-mainnet.g.alchemy.com/v2/...` |
| `PIMLICO_API_KEY` | For gasless transactions | `your_pimlico_key` |
| `BUNDLER_URL` | Pimlico bundler URL | `https://api.pimlico.io/v2/1/rpc` |
| `PAYMASTER_URL` | Pimlico paymaster URL | `https://api.pimlico.io/v2/1/rpc` |

### Optional but Recommended

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_EMAIL` | Admin login email | `iamtemam@gmail.com` |
| `ADMIN_PASSWORD_HASH` | SHA256 hash of admin password | `e47c04c7...` |
| `JWT_SECRET` | Secret for JWT tokens | Use a stable string |
| `ALCHEMY_API_KEY` | Alchemy API key | `your_alchemy_key` |
| `INFURA_API_KEY` | Infura API key | `your_infura_key` |
| `BIRDEYE_API_KEY` | Birdeye API for prices | `your_birdeye_key` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     AlphaPro Production                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │   Dashboard  │────▶│     API      │────▶│   Engine    │ │
│  │   (React)   │     │   (Node.js)  │     │  (Trading)  │ │
│  └──────────────┘     └──────────────┘     └─────────────┘ │
│         │                    │                    │          │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   PostgreSQL + Redis                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Blockchain (Ethereum/Arbitrum/Optimism)       │   │
│  │              Uniswap │ Aave │ Chainlink               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## How Trading Works

### 1. Opportunity Detection
- **RankingEngine** scans DEX pairs for arbitrage opportunities
- Uses real-time price data from Chainlink and Birdeye
- Calculates profitability considering gas costs

### 2. Risk Assessment
- **SentinelAgent** audits contracts for safety
- Checks liquidity adequacy
- Calculates price impact

### 3. Execution
- **ExecutionOrchestrator** manages concurrent trades
- **TradeExecutor** executes on-chain via:
  - Pimlico for gasless transactions (ERC-4337 AA)
  - Direct RPC calls for standard transactions

### 4. Profit Recording
- **TradeAuditService** logs all trades to database
- Real-time metrics via WebSocket to dashboard

---

## Mock/Simulation Code Removed

The following has been converted from mock to real API calls:

- ✅ Dashboard stats fetching (was hardcoded)
- ✅ Dashboard deployments (was mock data)
- ✅ Wallet balances (was mock data)
- ✅ System metrics (was mock data)

---

## Going Live Checklist

- [ ] Set `PRIVATE_KEY` in Render Dashboard
- [ ] Set `WALLET_ADDRESS` in Render Dashboard  
- [ ] Verify `TRADING_MODE=LIVE` in render.yaml
- [ ] Set `ETH_RPC_URL` (Alchemy recommended)
- [ ] Set `PIMLICO_API_KEY` for gasless transactions
- [ ] Set `JWT_SECRET` to a stable value (not randomly generated)
- [ ] Deploy and test login
- [ ] Verify engine status shows "LIVE" mode
- [ ] Monitor trades via dashboard

---

## Testing Profit Generation

1. **Start Engine**: POST `/api/engine/state` with `{ "action": "start" }`
2. **Monitor**: Watch `/api/engine/status` for trade executions
3. **Profit**: Check `/api/history` for completed trades with profit

---

## Security Notes

- NEVER commit `PRIVATE_KEY` to version control
- Use Render's secret storage for all sensitive variables
- Monitor wallet balance for unexpected drain
- Set up alerts for failed trades (via AlertingService)
