# AlphaPro Dashboard Specification

## Overview
Complete redesign of AlphaPro dashboard with sidebar navigation, real-time monitoring, and wallet/strategy management.

---

## 1. Header Section

### Current Elements
- Title: "AlphaPro v1.0.0-RC1"
- Currency Toggle: ETH / USD
- Wallet Balance display
- Live status indicator

### New Elements to Add
- **Total Wallet Balance**: Aggregate of all imported wallets (ETH + USD equivalent)
- **Data Refresh Interval**: Dropdown selector (1s, 5s, 10s, 15s, 30s)
- **Engine Status Indicator**: Running/Paused/Stopped
- **Engine Controls**: Start / Pause buttons

---

## 2. Sidebar Navigation

### Tab 1: Alpha-Copilot
- Quick ask input field
- Ask Copilot button
- Recent queries list (optional)

### Tab 2: Benchmark System
- Competitor comparison table
- Rank, Application, Profit/Trade, Velocity
- AlphaPro highlighted

### Tab 3: Strategies
**Metrics to Display:**
- Profits by Strategy (bar chart/table)
- Profits by Chain (Ethereum, Arbitrum, Optimism, Base, Polygon)
- Profits by Trading Pair (ETH/USDC, WBTC/ETH, etc.)
- Profits by DEX (Uniswap, Sushi, Curve)

### Tab 3: Blockchain Stream
- Real-time blockchain events
- Block numbers
- Transaction hashes (truncated)
- Flash loan events
- Profit per event
- Auto-scroll with pause option

### Tab 4: Settings

#### Wallet Management Panel
- **Upload Wallets**: Button to upload CSV/JSON list of non-custodial wallet addresses
- **Auto-validate**: System validates wallets across chains
- **Chain Columns**: Display balance per chain for each wallet
- **Collapse/Expand**: Table rows collapsible to show details
- **Wallet Count**: Total number of imported wallets
- **Total Balance**: Sum of all wallet balances (displayed in header too)

#### Engine Controls
- **Start Engine**: Button to start live/production mode
  - Changes UI to show "Engine Running" state
- **Pause Engine**: Button to pause active engine
- **Mode Indicator**: LIVE / PAPER / PAUSED

---

## 3. Profit Metrics Sidebar (to add)

### Real-time Metrics
- **Profit/Trade (PPT)**: Average profit per completed trade
- **Trades/Hour**: Number of successful trades per hour
- **Profits/Hour**: Total profit accumulated per hour
- **Total Volume**: Total trading volume
- **Win Rate**: Percentage of profitable trades

---

## 4. Main Content Area

### Existing Components (keep)
- Benchmark Dashboard (Competitive Landscape)
- Profit Control Panel
- Strategies Panel
- Alpha Copilot Chat

### To be Enhanced
- Connect to backend API for real data
- Add refresh interval functionality

---

## 5. Technical Implementation Plan

### Phase 1: Header Enhancement
- [ ] Add refresh interval dropdown
- [ ] Add total wallet balance display
- [ ] Add engine status indicator
- [ ] Add Start/Pause engine buttons

### Phase 2: Sidebar - Settings (Wallet Management)
- [ ] Create WalletManager component
- [ ] Add file upload handler (CSV/JSON)
- [ ] Create wallet validation API endpoint
- [ ] Build wallet table with collapse/expand
- [ ] Add chain balance columns
- [ ] Calculate and display total wallet count
- [ ] Calculate and display total balance

### Phase 3: Sidebar - Strategies
- [ ] Create StrategyMetrics component
- [ ] Add profits by strategy view
- [ ] Add profits by chain view
- [ ] Add profits by pair view
- [ ] Add profits by DEX view

### Phase 4: Sidebar - Blockchain Stream
- [ ] Enhance current stream component
- [ ] Add WebSocket connection for real-time events
- [ ] Add transaction details display
- [ ] Add profit tracking per event

### Phase 5: Profit Metrics Panel
- [ ] Create ProfitMetrics component
- [ ] Connect to backend for real-time data
- [ ] Add PPT, Trades/Hour, Profits/Hour displays

### Phase 6: Engine Controls
- [ ] Add start/pause functionality
- [ ] Connect to backend API
- [ ] Add status state management

---

## 6. API Endpoints Needed

```
GET  /api/wallets          - List all wallets
POST /api/wallets/import  - Import wallets from CSV/JSON
GET  /api/wallets/validate - Validate wallets across chains
GET  /api/strategies/metrics - Get strategy performance
GET  /api/profits/metrics - Get profit metrics
GET  /api/engine/status   - Get engine status
POST /api/engine/start    - Start engine
POST /api/engine/pause    - Pause engine
GET  /api/stream/events   - WebSocket for blockchain events
```

---

## 7. File Structure

```
AlphaPro/alphapro-api/client/src/
├── components/
│   ├── DashboardLayout.tsx      (existing - update)
│   ├── Header.tsx               (new)
│   ├── Sidebar/
│   │   ├── WalletManager.tsx    (new)
│   │   ├── StrategyMetrics.tsx  (new)
│   │   ├── BlockchainStream.tsx (update)
│   │   └── ProfitMetrics.tsx    (new)
│   └── EngineControls.tsx       (new)
├── hooks/
│   ├── useEngine.ts              (new)
│   └── useWallets.ts             (new)
└── App.tsx                       (update)
```
