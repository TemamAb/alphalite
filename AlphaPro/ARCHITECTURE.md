# AlphaPro Architecture - Live Paper Trading Mode

## System Overview
```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ALPHAPRO TRADING SYSTEM                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐  │
│  │   Client    │     │   Client    │     │      Client            │  │
│  │  (Browser)  │     │  (Browser)  │     │   (Benchmark)          │  │
│  └──────┬──────┘     └──────┬──────┘     └───────────┬─────────────┘  │
│         │                   │                         │                │
│         └───────────────────┼─────────────────────────┘                │
│                             │                                            │
│                      ┌──────▼──────┐                                    │
│                      │  NGINX /    │                                    │
│                      │  API GW     │                                    │
│                      └──────┬──────┘                                    │
│                             │                                            │
│         ┌───────────────────┼───────────────────┐                      │
│         │                   │                   │                      │
│  ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐              │
│  │   API       │     │   Brain     │     │   Sentinel  │              │
│  │  (Express)  │◄───►│  (Python)   │     │  (Monitoring│              │
│  │  :3000      │     │  :5000      │     │   :5001     │              │
│  └──────┬──────┘     └─────────────┘     └─────────────┘              │
│         │                                                            │
│  ┌──────▼──────┐                                                      │
│  │  Enterprise │                                                      │
│  │  Profit     │                                                      │
│  │  Engine     │                                                      │
│  └──────┬──────┘                                                      │
│         │                                                            │
│  ┌──────▼──────┐     ┌─────────────┐     ┌─────────────┐             │
│  │  Data       │     │  Database   │     │    Redis    │             │
│  │  Fusion     │     │  PostgreSQL │     │   (Pub/Sub) │             │
│  │  Engine     │     │  :5432      │     │   :6379     │             │
│  └─────────────┘     └─────────────┘     └─────────────┘             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Trading Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `PAPER` | Simulated trading with fake money | Testing, strategy development |
| `LIVE` | Real trading with real funds | Production trading |

## Live Paper Trading Configuration

### Environment Variables
- `TRADING_MODE=PAPER` - Enables paper trading simulation
- `NODE_ENV=production` - Production environment
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

### Services
1. **PostgreSQL** (:5433) - Data persistence
2. **Redis** (:6380) - Caching and pub/sub
3. **API** (:3001) - Express server with trading engine
4. **Brain** (:5000) - Python AI service

### API Endpoints
- `GET /api/health` - Health check
- `GET /api/preflight` - Pre-flight checks
- `GET /api/engine/state` - Get trading mode
- `POST /api/engine/state` - Change mode (start/pause)
- `GET /api/engine/stats` - Get trading stats
- `WS /ws` - Real-time stats updates

## Getting Started
```bash
# Build and start all services
docker-compose up --build

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```
