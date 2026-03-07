/**
 * Execution Orchestrator
 * Manages the execution queue, concurrency, and capital allocation for trades.
 * It is event-driven, processing opportunities as they are identified by the Profit Engine.
 */
const EventEmitter = require('events');
const capitalManager = require('./CapitalManager');
const tradeExecutor = require('./TradeExecutor');
const configService = require('../../../configService');
const { performance } = require('perf_hooks');

class ExecutionOrchestrator extends EventEmitter {
    constructor() {
        super();
        this.config = configService.getConfig();
        this.baseInterval = 50;
        this.processingInterval = 50; // Process queue every 50ms for high throughput
        this.timer = null;
        this.activeTrades = new Map(); // key: tradeId, value: { opportunity, status, startTime }
        this.tradeQueue = [];
        this.isProcessingQueue = false;

        configService.on('config_update', (newConfig) => {
            this.config = newConfig;
        });
    }

    start() {
        if (this.timer) return;
        console.log('[ORCHESTRATOR] 🚀 Concurrency engine starting...');
        this.timer = setInterval(() => this.processQueue(), this.processingInterval);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            this.tradeQueue = [];
            console.log('[ORCHESTRATOR] 🛑 Concurrency engine stopped.');
        }
    }

    canExecute() {
        const maxConcurrent = this.config.maxConcurrentExecutions || 5;
        return this.activeTrades.size < maxConcurrent;
    }

    /**
     * KILLER STRATEGY: Adaptive Volatility Turbo Mode
     * Dynamically adjusts execution speed and concurrency based on market volatility.
     * @param {number} volatilityIndex - 0 to 100
     */
    setVolatilityMode(volatilityIndex) {
        // 1. Adjust Processing Interval (Heartbeat)
        // Low Vol (0-30): 100ms (Save CPU)
        // Med Vol (30-70): 50ms (Standard)
        // High Vol (70+): 5ms (Turbo - Maximum Velocity)
        let newInterval = 50;
        if (volatilityIndex > 70) newInterval = 5;
        else if (volatilityIndex < 30) newInterval = 100;

        // Only restart timer if interval changed significantly
        if (this.timer && Math.abs(this.processingInterval - newInterval) > 10) {
            console.log(`[ORCHESTRATOR] 🏎️ TURBO MODE ADJUST: Volatility ${volatilityIndex.toFixed(0)} -> Interval ${newInterval}ms`);
            clearInterval(this.timer);
            this.processingInterval = newInterval;
            this.timer = setInterval(() => this.processQueue(), this.processingInterval);
        }

        // 2. Adjust Concurrency Limits (Dynamic Scaling)
        // We temporarily override the config limit in high volatility
        this.dynamicConcurrencyBonus = volatilityIndex > 80 ? 10 : 0; // +10 threads in extreme volatility
    }

    /**
     * Entry point for new opportunities from the Profit Engine.
     * @param {object} opportunity - The opportunity object from EnterpriseProfitEngine.
     */
    queueOpportunity(opportunity) {
        this.tradeQueue.push(opportunity);
    }

    /**
     * Processes the opportunity queue if execution slots are available.
     */
    async processQueue() {
        if (this.isProcessingQueue || this.tradeQueue.length === 0) {
            return;
        }
        this.isProcessingQueue = true;

        const maxConcurrent = (this.config.maxConcurrentExecutions || 5) + (this.dynamicConcurrencyBonus || 0);

        while (this.activeTrades.size < maxConcurrent && this.tradeQueue.length > 0) {
            const opportunity = this.tradeQueue.shift();
            if (opportunity) {
                this.executeTrade(opportunity); // Fire-and-forget execution
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * The core execution logic for a single trade.
     * @param {object} opportunity - The enriched opportunity object.
     */
    async executeTrade(opportunity) {
        const { pair, strategy, profit, chainId } = opportunity;
        const requiredCapital = 10; // Example capital, can be made dynamic
        const tradeId = `trade_${Date.now()}_${pair.slice(-6)}`;

        if (!capitalManager.requestCapital(requiredCapital, opportunity)) {
            console.log(`[ORCHESTRATOR] Capital denied for ${pair}. Re-queueing.`);
            this.tradeQueue.unshift(opportunity); // Put it back at the front of the queue
            return;
        }

        // Add to active trades map
        this.activeTrades.set(tradeId, { ...opportunity, status: 'EXECUTING', startTime: performance.now() });

        try {
            console.log(`[ORCHESTRATOR] Dispatching trade for ${pair} on chain ${chainId} via ${strategy.name}`);
            const result = await tradeExecutor.execute(opportunity, requiredCapital);
            
            const duration = performance.now() - this.activeTrades.get(tradeId).startTime;
            const completedTrade = { ...opportunity, status: 'COMPLETED', result, profit, duration };
            
            this.activeTrades.set(tradeId, completedTrade);
            this.emit('tradeCompleted', completedTrade);

        } catch (error) {
            console.error(`[ORCHESTRATOR] Execution failed for ${pair}:`, error.message);
            this.activeTrades.set(tradeId, { ...opportunity, status: 'FAILED', error: error.message });
        } finally {
            capitalManager.releaseCapital(requiredCapital);
            // Remove from active trades after a short delay for UI/logging to catch up
            setTimeout(() => this.activeTrades.delete(tradeId), 5000);
        }
    }

    getConcurrencyMetrics() {
        const metrics = {
            strategies: {},
            chains: {},
            dexes: {},
            pairs: {}
        };

        for (const trade of this.activeTrades.values()) {
            if (trade.status === 'EXECUTING') {
                const strategyName = trade.strategy?.name || 'Unknown';
                metrics.strategies[strategyName] = (metrics.strategies[strategyName] || 0) + 1;

                const chainId = trade.chainId || 'ethereum';
                metrics.chains[chainId] = (metrics.chains[chainId] || 0) + 1;

                const dexId = trade.dex?.id || 'unknown';
                if (dexId !== 'unknown') {
                    const dexKey = `${chainId}_${dexId}`;
                    metrics.dexes[dexKey] = (metrics.dexes[dexKey] || 0) + 1;
                }

                const pairKey = trade.pair;
                metrics.pairs[pairKey] = (metrics.pairs[pairKey] || 0) + 1;
            }
        }
        return metrics;
    }
    
    getStatus() {
        return {
            isRunning: !!this.timer,
            activeTradeCount: this.activeTrades.size,
            queuedTrades: this.tradeQueue.length,
            capitalStatus: capitalManager.getStatus(),
            turboMode: this.processingInterval < 20
        };
    }
}

module.exports = new ExecutionOrchestrator();