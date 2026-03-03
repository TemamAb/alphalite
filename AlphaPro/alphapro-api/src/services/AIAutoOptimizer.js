/**
 * AlphaPro AI Auto-Optimizer
 * Real-time optimization engine that adjusts system parameters
 * based on rankings and market conditions every 30 seconds
 */

const EventEmitter = require('events');
const RankingEngine = require('./RankingEngine');

class AIAutoOptimizer extends EventEmitter {
    constructor() {
        super();

        // Optimization parameters
        this.optimizationInterval = 30000; // 30 seconds
        this.isRunning = false;

        // Performance tracking
        this.performanceHistory = [];
        this.optimizationDecisions = [];

        // Learning parameters (reinforcement learning inspired)
        this.learningRate = 0.1;
        this.explorationRate = 0.2;
        this.confidenceThreshold = 0.75;

        // Strategy weights (learned over time)
        this.strategyWeights = {
            'Flash Loan': 0.15,
            'Cross-DEX': 0.20,
            'Triangular': 0.15,
            'LVR': 0.10,
            'Sandwich Attack': 0.12,
            'JIT Liquidity': 0.08,
            'Liquidations': 0.10,
            'Cross-Chain': 0.10,
            'Spatial Arbitrage': 0.05,
            'Statistical Arbitrage': 0.05,
            'Funding Rate Arbitrage': 0.05,
            'Basis Trading': 0.05,
            'Volatility Arbitrage': 0.05,
            'MEV Extract': 0.05,
            'Dex Aggregator': 0.05,
            'Index Rebalance': 0.05
        };

        // Chain allocation (percentage of capital per chain)
        this.chainAllocation = {};

        // DEX preference scores
        this.dexPreferences = {};

        // Pair focus scores
        this.pairFocus = {};

        // Start the optimizer
        this.start();
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        console.log('[AI-OPTIMIZER] 🤖 AI Auto-Optimizer started (30s interval)');

        // Run initial optimization
        this.runOptimization();

        // Set up interval
        this.optimizationTimer = setInterval(() => {
            this.runOptimization();
        }, this.optimizationInterval);

        // Also listen to ranking updates for real-time adjustments
        RankingEngine.on('autoUpdateComplete', (data) => {
            this.handleRankingUpdate(data);
        });
    }

    stop() {
        if (this.optimizationTimer) {
            clearInterval(this.optimizationTimer);
        }
        this.isRunning = false;
        console.log('[AI-OPTIMIZER] 🛑 AI Auto-Optimizer stopped');
    }

    async runOptimization() {
        try {
            console.log('[AI-OPTIMIZER] 🔄 Running optimization cycle...');

            // Get current rankings
            const rankings = RankingEngine.getRankingReport();

            if (!rankings) {
                console.log('[AI-OPTIMIZER] ⚠️ No ranking data available');
                return;
            }

            // 1. Optimize chain allocation
            this.optimizeChainAllocation(rankings.topChains);

            // 2. Optimize DEX preferences
            this.optimizeDexPreferences(rankings.topDexes);

            // 3. Optimize pair focus
            this.optimizePairFocus(rankings.topPairs);

            // 4. Optimize strategy weights
            this.optimizeStrategyWeights(rankings);

            // 5. Generate AI recommendations
            const recommendations = this.generateRecommendations(rankings);

            // 6. Apply optimizations
            this.applyOptimizations(recommendations);

            // 7. Emit event for Copilot
            this.emit('optimizationComplete', {
                timestamp: Date.now(),
                recommendations,
                allocations: this.chainAllocation,
                strategyWeights: this.strategyWeights,
                performance: this.getPerformanceMetrics()
            });

            console.log(`[AI-OPTIMIZER] ✅ Optimization complete - ${recommendations.length} recommendations`);

        } catch (error) {
            console.error('[AI-OPTIMIZER] ❌ Optimization error:', error);
        }
    }

    handleRankingUpdate(data) {
        // Quick reaction to significant ranking changes
        if (data.chains && data.chains.length > 0) {
            const topChain = data.chains[0];

            // If a chain suddenly has very high score, trigger immediate optimization
            if (topChain.score > 90) {
                console.log(`[AI-OPTIMIZER] 🚨 High opportunity detected on ${topChain.id}!`);
                this.immediateReallocation(topChain.id);
            }
        }
    }

    optimizeChainAllocation(chains) {
        if (!chains || chains.length === 0) return;

        // Calculate total score
        const totalScore = chains.reduce((sum, c) => sum + c.score, 0);

        // Allocate capital proportionally to scores
        const newAllocation = {};

        chains.forEach((chain, index) => {
            // Base allocation from score
            let allocation = (chain.score / totalScore) * 100;

            // Bonus for top 3 chains
            if (index < 3) {
                allocation *= 1.2;
            }

            // Cap at 40% per chain
            allocation = Math.min(40, allocation);

            newAllocation[chain.id] = Math.round(allocation * 10) / 10;
        });

        // Normalize to 100%
        const totalAlloc = Object.values(newAllocation).reduce((a, b) => a + b, 0);
        Object.keys(newAllocation).forEach(key => {
            newAllocation[key] = Math.round((newAllocation[key] / totalAlloc) * 1000) / 10;
        });

        // Track change for learning
        const changes = this.compareAllocations(this.chainAllocation, newAllocation);
        if (Object.keys(changes).length > 0) {
            this.recordDecision('chain_allocation', changes);
        }

        this.chainAllocation = newAllocation;
        console.log(`[AI-OPTIMIZER] 📊 Chain Allocation:`, this.chainAllocation);
    }

    optimizeDexPreferences(dexes) {
        if (!dexes || dexes.length === 0) return;

        const newPrefs = {};

        // Group by chain
        const byChain = {};
        dexes.forEach(dex => {
            if (!byChain[dex.chain]) byChain[dex.chain] = [];
            byChain[dex.chain].push(dex);
        });

        // Assign preferences per chain
        Object.keys(byChain).forEach(chain => {
            const chainDexes = byChain[chain];
            const totalScore = chainDexes.reduce((sum, d) => sum + d.score, 0);

            chainDexes.forEach((dex, index) => {
                const key = `${chain}_${dex.id}`;
                let pref = (dex.score / totalScore) * 100;

                // Boost preferred DEXs
                if (index === 0) pref *= 1.3;

                newPrefs[key] = Math.min(100, Math.round(pref * 10) / 10);
            });
        });

        const changes = this.compareAllocations(this.dexPreferences, newPrefs);
        if (Object.keys(changes).length > 0) {
            this.recordDecision('dex_preference', changes);
        }

        this.dexPreferences = newPrefs;
    }

    optimizePairFocus(pairs) {
        if (!pairs || pairs.length === 0) return;

        const newFocus = {};

        pairs.forEach((pair, index) => {
            // Score based on ranking position and pair score
            let focus = pair.score;

            // Boost top pairs more
            if (index < 5) focus *= 1.5;
            else if (index < 10) focus *= 1.2;

            newFocus[pair.pair] = Math.round(focus * 10) / 10;
        });

        const changes = this.compareAllocations(this.pairFocus, newFocus);
        if (Object.keys(changes).length > 0) {
            this.recordDecision('pair_focus', changes);
        }

        this.pairFocus = newFocus;
    }

    optimizeStrategyWeights(rankings) {
        // Adjust strategy weights based on market conditions
        const newWeights = { ...this.strategyWeights };

        // Get current market opportunity scores
        const topPairs = rankings.topPairs || [];
        const topChains = rankings.topChains || [];

        // Analyze opportunity types
        const highSpreadOpportunities = topPairs.filter(p => p.avgSpreadBps > 20).length;
        const crossChainOpportunities = topChains.filter(c => c.score > 80).length;

        // Adjust weights dynamically
        if (highSpreadOpportunities > 5) {
            // Good for cross-DEX arbitrage
            newWeights['Cross-DEX'] = Math.min(30, newWeights['Cross-DEX'] + 2);
            newWeights['Triangular'] = Math.min(25, newWeights['Triangular'] + 1);
        }

        if (crossChainOpportunities > 3) {
            // Good for cross-chain
            newWeights['Cross-Chain'] = Math.min(25, newWeights['Cross-Chain'] + 3);
        }

        // Reduce weights for poor opportunities
        if (newWeights['Sandwich Attack'] > 15) {
            newWeights['Sandwich Attack'] = Math.max(5, newWeights['Sandwich Attack'] - 1);
        }

        // Normalize weights to sum to 1
        const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
        Object.keys(newWeights).forEach(key => {
            newWeights[key] = Math.round((newWeights[key] / total) * 100) / 100;
        });

        this.strategyWeights = newWeights;
        console.log(`[AI-OPTIMIZER] ⚖️ Strategy Weights:`, this.strategyWeights);
    }

    generateRecommendations(rankings) {
        const recommendations = [];

        // Top chain recommendation
        if (rankings.topChains && rankings.topChains.length > 0) {
            const topChain = rankings.topChains[0];
            recommendations.push({
                type: 'chain',
                priority: 'HIGH',
                message: `Allocate more capital to ${topChain.id} (score: ${topChain.score.toFixed(1)})`,
                action: `increase_allocation`,
                target: topChain.id,
                confidence: topChain.score / 100
            });
        }

        // Best DEX recommendation
        if (rankings.topDexes && rankings.topDexes.length > 0) {
            const topDex = rankings.topDexes[0];
            recommendations.push({
                type: 'dex',
                priority: 'MEDIUM',
                message: `Use ${topDex.id} on ${topDex.chain} for next trade`,
                action: 'set_preferred_dex',
                target: `${topDex.chain}_${topDex.id}`,
                confidence: topDex.score / 100
            });
        }

        // Best pair recommendation
        if (rankings.topPairs && rankings.topPairs.length > 0) {
            const topPair = rankings.topPairs[0];
            recommendations.push({
                type: 'pair',
                priority: 'HIGH',
                message: `Focus on ${topPair.pair} (spread: ${topPair.avgSpreadBps} bps)`,
                action: 'focus_pair',
                target: topPair.pair,
                confidence: topPair.score / 100
            });
        }

        // Strategy adjustment
        const lowestStrategy = Object.entries(this.strategyWeights)
            .sort((a, b) => a[1] - b[1])[0];
        if (lowestStrategy && lowestStrategy[1] < 0.08) {
            recommendations.push({
                type: 'strategy',
                priority: 'LOW',
                message: `Consider reducing ${lowestStrategy[0]} allocation`,
                action: 'reduce_strategy',
                target: lowestStrategy[0],
                confidence: 0.6
            });
        }

        return recommendations;
    }

    applyOptimizations(recommendations) {
        recommendations.forEach(rec => {
            if (rec.confidence >= this.confidenceThreshold) {
                // Apply high-confidence recommendations
                this.emit('applyOptimization', rec);
            }
        });
    }

    immediateReallocation(chainId) {
        console.log(`[AI-OPTIMIZER] ⚡ Immediate reallocation to ${chainId}`);

        // Increase allocation to the hot chain
        const current = this.chainAllocation[chainId] || 0;
        const newAlloc = Math.min(50, current + 15);

        this.chainAllocation[chainId] = newAlloc;

        this.emit('immediateReallocation', {
            chain: chainId,
            newAllocation: newAlloc,
            timestamp: Date.now()
        });
    }

    compareAllocations(oldAlloc, newAlloc) {
        const changes = {};
        const allKeys = new Set([...Object.keys(oldAlloc), ...Object.keys(newAlloc)]);

        allKeys.forEach(key => {
            const oldVal = oldAlloc[key] || 0;
            const newVal = newAlloc[key] || 0;
            const diff = newVal - oldVal;

            if (Math.abs(diff) > 1) {
                changes[key] = { from: oldVal, to: newVal, diff };
            }
        });

        return changes;
    }

    recordDecision(type, changes) {
        this.optimizationDecisions.push({
            type,
            changes,
            timestamp: Date.now()
        });

        // Keep last 100 decisions
        if (this.optimizationDecisions.length > 100) {
            this.optimizationDecisions.shift();
        }
    }

    getPerformanceMetrics() {
        return {
            uptime: Date.now() - (this.optimizationDecisions[0]?.timestamp || Date.now()),
            totalDecisions: this.optimizationDecisions.length,
            currentAllocations: this.chainAllocation,
            strategyWeights: this.strategyWeights,
            topPairs: Object.keys(this.pairFocus).slice(0, 10)
        };
    }

    // Get current state for Copilot
    getState() {
        return {
            isRunning: this.isRunning,
            interval: this.optimizationInterval,
            chainAllocation: this.chainAllocation,
            dexPreferences: this.dexPreferences,
            pairFocus: this.pairFocus,
            strategyWeights: this.strategyWeights,
            performance: this.getPerformanceMetrics(),
            recentDecisions: this.optimizationDecisions.slice(-10)
        };
    }

    // Manual trigger for optimization
    triggerOptimization() {
        this.runOptimization();
    }
}

module.exports = new AIAutoOptimizer();
