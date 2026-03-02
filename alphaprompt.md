# Prompt: Generate "AlphaPro" - The Secure Competitive Dominance System

**Persona:**
You are a world-class Lead Quantitative Architect. Your mandate is to build "AlphaPro," a system that dominates the DeFi ecosystem through "Quantum Algorithmic Thinking." You are an expert in adversarial AI, Account Abstraction (ERC-4337), AWS KMS security, and creating simulation-first architectures that guarantee error-free production deployment.

**Core Mandate: The AlphaPro Protocol**
1.  **Quantum Intelligence:** The AI must think in algorithmic quantum states, continually evolving to reach a "Theoretical Maximum" of profitability that exceeds the best metrics of the top 5 DeFi benchmarks.
2.  **Deep Dive Simulation (Paper Trading):** Before any live deployment, the system must run in a Dockerized "Paper Trading" mode. It must simulate millions of market scenarios to "learn the game" without risking capital.
3.  **Alpha-Copilot Projection:** The AI Copilot must analyze the paper trading session and report projected production performance to the user. It acts as a gatekeeper, only recommending cloud deployment (Render) once the simulation is error-free and profitable.
4.  **Secure Dominance:** Once live, it operates in **Gasless Mode** (Pimlico) with **Secure Signing**, maintaining the market leadership established during simulation.

**The 5-Agent AI Persona Architecture:**
To achieve this dominance, the system is decomposed into five specialized autonomous agents:
1.  **The Alpha Hunter (Strategy):** Scans mempools/DEXs 24/7 for opportunities. Focuses purely on finding profit.
2.  **The Sentinel (Risk):** Audits contracts for honeypots/rugs. Has veto power over the Hunter.
3.  **The MEV Engineer (Execution):** Optimizes gas, bundles transactions, and manages Flashbots interactions.
4.  **The Oracle (Optimization):** The strategic brain. Benchmarks against competitors, runs "Theoretical Maximum" simulations, and dynamically reconfigures the system to catch up and surpass market leaders.
5.  **The Architect (Infrastructure):** Monitors system health, latency, and node provider status to ensure 99.99% uptime.

**Enterprise AI Training Protocol (Best Practice):**
To match top-tier firms (Citadel/Jump), the system rejects "static module tuning" in favor of **"Training the Personal"**:
1.  **Agentic Reinforcement Learning:** The agents (Hunter, Sentinel, Oracle) are not static scripts. They are trained models that learn *policies* via Reinforcement Learning (RL) inside the simulation gym.
    *   *Example:* The Sentinel learns the *concept* of a honeypot by seeing thousands of failed transactions in simulation, rather than relying on hardcoded regex.
2.  **Hierarchical Risk (Pre-Trade):** Risk is not a post-trade calculation. The Sentinel is trained to act as a central risk desk with absolute veto power, ensuring no "alpha" overrides safety.
3.  **Regime-Based Adaptation:** The Oracle is trained to recognize market regimes (e.g., "High Volatility") and switch the *entire organization's* operating mode, effectively retraining the squad in real-time.

---

### **Technical Specifications**

**1. Unified Hybrid Architecture:**
*   **API Gateway (`alphapro-api`):** Node.js (v20) service running the `EnterpriseProfitEngine` and the Agent Coordinator.
*   **Quantum Brain (`alphapro-brain`):** Python (v3.11) service hosting **The Oracle** and its evolutionary optimization loop.
*   **Analytics Database (`alphapro-db`):** PostgreSQL for storing "Paper" and "Live" trade data, plus agent logs.

**2. The Simulation Engine (Paper Trading Mode):**
*   **Dual-Mode Engine:** The `EnterpriseProfitEngine` must have a `MODE` switch (`PAPER` | `LIVE`).
*   **Deep Dive Analysis:** In `PAPER` mode, the system mocks the `Pimlico` and `KmsSigner` interactions but executes real strategy logic against live chain data (forked or read-only), logging "Virtual Profit" and "Virtual Gas."
*   **Local Dockerization:** The system is designed to run locally via `docker-compose` for the learning phase.

**3. AI-Powered Competitive Optimization (The Oracle):**
*   **Theoretical Maximum Search:** The Oracle uses quantum-inspired evolutionary algorithms (e.g., Simulated Annealing) to find the global maximum for Profit Per Trade (PPT) and Capital Velocity.
*   **Benchmark Catch-Up:** It continuously compares `AlphaPro.VirtualMetrics` against `Competitor.LiveMetrics` and adjusts global parameters (Risk, Loan Size) to close the gap.

**4. Alpha-Copilot & Dashboard:**
*   **Copilot Panel:** A dedicated UI section where the AI answers: "Based on the last 24h simulation, what is my projected monthly profit in production?"
*   **Performance Projection:** The Copilot calculates a "Confidence Score" for deployment.
*   **Visuals:** Charts showing "Simulated vs. Projected Live" performance.

**5. Enterprise Security (Live Mode Only):**
*   **Secure Signing:** Secure Enclave or Encrypted Keystore for signing.
*   **Gasless:** Pimlico Paymaster for sponsorship.

---

### **Deliverables**

1.  **Project File Structure:** A complete ASCII tree including the new `alphapro-agents` module.
2.  **Simulation Engine:** Logic in `EnterpriseProfitEngine.js` to handle `PAPER` vs `LIVE` execution.
3.  **The Oracle Logic:** Python code in `oracle.py` (inside `alphapro-brain`) for the "Theoretical Maximum" algorithm.
4.  **Agent Coordinator:** Node.js logic to manage the flow between Hunter, Sentinel, and MEV Engineer.
5.  **Copilot Service:** Logic to analyze simulation DB records and generate text reports.
6.  **Frontend:** Dashboard with "Simulation Mode" indicators and Copilot chat interface.
7.  **Infrastructure:** `docker-compose.yml` (Local Simulation) and `render.yaml` (Cloud Production).
