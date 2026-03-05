# AlphaPro Module Structure Analysis

## Current Structure Issues

| Issue | Description |
|-------|-------------|
| Duplicated files | `data_sources.json` exists in 2 places |
| Mixed concerns | API, client, config all together |
| No clear boundaries | Everything in alphapro-api |
| Deployment confusion | 3 different docker-compose files |

---

## Recommended 8-Module Structure

```
AlphaPro/
├── 📦 modules/
│   ├── 🧠 1. brain/              # AI & ML Module
│   ├── ⚙️  2. engine/            # Trading Engine Module
│   ├── 🌐 3. api/                # REST API Module
│   ├── 💻 4. client/             # Frontend Dashboard Module
│   ├── 🔗 5. contracts/          # Smart Contracts Module
│   ├── 🧪 6. tests/              # Testing Module
│   ├── 📚 7. docs/               # Documentation Module
│   └── 🚀 8. deployments/        # Deployment Configs
│
├── config/                        # Global configuration
├── data/                         # Data files (not in git)
└── .env                          # Environment variables
```

---

## Module 1: Brain (AI & ML)

**Purpose**: AI analysis, regime detection, optimization

```
modules/brain/
├── app.py                    # FastAPI/Flask server
├── Dockerfile
├── requirements.txt
├── src/
│   ├── analyzer.py          # Market regime analysis
│   ├── optimizer.py         # Strategy optimization
│   └── predictor.py         # Price/movement prediction
└── models/                  # Trained ML models
```

**Responsibilities**:
- Market regime detection
- Strategy parameter optimization
- AI-driven decision making

---

## Module 2: Engine (Trading Engine)

**Purpose**: Core arbitrage execution engine

```
modules/engine/
├── EnterpriseProfitEngine.js    # Main engine ⭐
├── DataFusionEngine.js          # Data aggregation
├── MultiPathDetector.js         # Cross-DEX detection
├── MEVEngineer.js              # MEV strategies
├── SentinelAgent.js             # Monitoring agent
├── strategies.json              # Strategy definitions
└── services/
    ├── RankingEngine.js         # Opportunity ranking
    ├── TradeDatabase.js         # Trade persistence
    ├── AIAutoOptimizer.js       # Auto-optimization
    └── BrainConnector.js        # AI Brain integration
```

**Responsibilities**:
- Real-time opportunity detection
- Trade execution via ERC-4337
- Profit tracking and reporting

---

## Module 3: API (REST Server)

**Purpose**: HTTP API for dashboard and external integration

```
modules/api/
├── app.js                    # Express.js server ⭐
├── package.json
├── config/
│   └── configService.js     # Configuration loader
├── routes/
│   ├── wallets.js           # Wallet management
│   ├── engine.js            # Engine control
│   └── analytics.js         # Stats & reporting
├── middleware/
│   ├── auth.js              # Authentication
│   ├── rateLimit.js         # Rate limiting
│   └── audit.js             # Audit logging
└── utils/
    ├── validation.js         # Input validation
    └── cache.js             # In-memory cache
```

**Responsibilities**:
- RESTful API endpoints
- Authentication & authorization
- Request validation & rate limiting

---

## Module 4: Client (Frontend Dashboard)

**Purpose**: React-based trading dashboard

```
modules/client/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── index.html
├── src/
│   ├── main.tsx            # Entry point
│   ├── App.tsx             # Root component
│   ├── components/
│   │   ├── DashboardLayout.tsx    # Main layout ⭐
│   │   ├── AlphaCopilot.tsx       # AI assistant
│   │   ├── ProfitControl.tsx      # Profit panel
│   │   └── BenchmarkDashboard.tsx # Analytics
│   ├── stores/                     # State management
│   └── hooks/                      # Custom React hooks
└── public/
    └── icons/
```

**Responsibilities**:
- Real-time dashboard UI
- Trading controls
- Performance analytics display

---

## Module 5: Contracts (Smart Contracts)

**Purpose**: DeFi integrations and flash loans

```
modules/contracts/
├── contracts/
│   ├── FlashLoanExecutor.sol
│   └── interfaces/
│       └── IFlashLoan.sol
├──abi/                      # Compiled ABIs
├── scripts/
│   └── deploy.js            # Deployment scripts
└── hardhat.config.js        # If using Hardhat
```

**Responsibilities**:
- Flash loan execution
- DEX integrations
- Custom protocol adapters

---

## Module 6: Tests

**Purpose**: Integration and unit testing

```
modules/tests/
├── integration/
│   ├── engine.test.js
│   ├── api.test.js
│   └── e2e.test.js
├── unit/
│   ├── strategies.test.js
│   └── validation.test.js
├── fixtures/
│   └── mockData.json
├── jest.config.js
└── README.md
```

**Responsibilities**:
- Unit tests for all modules
- Integration tests
- E2E testing

---

## Module 7: Docs

**Purpose**: Documentation and guides

```
modules/docs/
├── ARCHITECTURE.md          # System architecture
├── API_REFERENCE.md          # API endpoints
├── DEPLOYMENT.md            # Deployment guide
├── TROUBLESHOOTING.md       # Common issues
└── CHANGELOG.md            # Version history
```

---

## Module 8: Deployments

**Purpose**: Container orchestration

```
modules/deployments/
├── docker-compose.yml        # Development
├── docker-compose-prod.yml   # Production
├── docker-compose-scale.yml  # Horizontal scaling
├── kubernetes/
│   ├── api-deployment.yaml
│   ├── engine-deployment.yaml
│   └── nginx-ingress.yaml
├── terraform/               # Infrastructure as Code
│   └── main.tf
└── render.yaml             # Render.com config
```

---

## Shared Configuration (Root)

```
AlphaPro/
├── config/
│   ├── data_sources.json    # Single source of truth
│   └── constants.js
├── .env.example             # Template
├── package.json             # Root scripts
├── lerna.json              # Monorepo config
└── tsconfig.base.json      # Shared TypeScript config
```

---

## Module Summary Table

| Module | Tech Stack | Purpose | Dependencies |
|--------|-----------|---------|--------------|
| **brain** | Python/FastAPI | AI Analysis | None |
| **engine** | Node.js | Trading Execution | brain, contracts |
| **api** | Node.js/Express | HTTP Server | engine |
| **client** | React/Vite | Dashboard | api |
| **contracts** | Solidity | Smart Contracts | None |
| **tests** | Jest/Supertest | Testing | All |
| **docs** | Markdown | Documentation | None |
| **deployments** | Docker/K8s | Orchestration | All |

---

## Recommended Monorepo Setup

Use **Lerna** or **Turborepo** for monorepo management:

```json
{
  "name": "alphapro",
  "private": true,
  "workspaces": [
    "modules/*"
  ],
  "scripts": {
    "dev:all": "lerna run dev --parallel",
    "build:all": "lerna run build",
    "test:all": "lerna run test"
  }
}
```

---

## Migration Steps

1. ✅ Create `modules/` directory
2. ✅ Move `alphapro-brain/` → `modules/brain/`
3. ✅ Move `alphapro-api/src/engine/` → `modules/engine/`
4. ✅ Move `alphapro-api/` → `modules/api/`
5. ✅ Move `alphapro-api/client/` → `modules/client/`
6. ✅ Move `contracts/` → `modules/contracts/`
7. ✅ Create `modules/tests/`
8. ✅ Create `modules/docs/`
9. ✅ Move deployment configs → `modules/deployments/`
10. ✅ Create shared `config/`
11. ✅ Copy services (RankingEngine, TradeDatabase, AIAutoOptimizer, BrainConnector) to `modules/engine/services/`
12. ✅ Fix import paths in api/app.js and engine/EnterpriseProfitEngine.js

---

*This structure provides clear separation of concerns, easier maintenance, and better scalability.*
