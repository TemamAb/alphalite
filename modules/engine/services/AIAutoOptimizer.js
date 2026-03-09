/**
 * AlphaPro AI Auto-Optimizer
 * Dual-Source Intelligence:
 * 1. Self-Learning: Genetic evolution based on internal trade performance.
 * 2. Competitor Forging: Reverse-engineering market winners to adapt strategies.
 * 
 * Evolves system parameters every 30 seconds towards the Theoretical Maximum.
 */
const rankingEngine = require('./RankingEngine');
const brainConnector = require('./BrainConnector');
const profitEngine = require('../EnterpriseProfitEngine');
const competitorAnalysis = require('./CompetitorAnalysisService');

class AIAutoOptimizer {
    constructor() {
        this.optimizationInterval = 30000; // 30 seconds
        this.mutationRate = 0.1; // Default 10%
        this.timer = null;
        this.generation = 1;
        this.bestFitness = 0;
        
        // Current best weights (The "DNA" of the system)
        this.currentGenome = { ...rankingEngine.weights };
        
        // History for learning
        this.evolutionHistory = [];
    }

    start() {
        console.log('[AI-OPTIMIZER] 🧠 Starting Dual-Source Evolution Engine...');
        this.timer = setInterval(() => this.evolve(), this.optimizationInterval);
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
        console.log('[AI-OPTIMIZER] Stopped.');
    }

    async evolve() {
        console.log(`[AI-OPTIMIZER] Generation ${this.generation}: Evolving...`);

        // INTEGRATION: Consult the Python Brain for Market Regime
        const regime = await brainConnector.detectMarketRegime();
        
        // SOURCE 1: Self-Learning (Internal Performance)
        const internalFitness = this.evaluateInternalPerformance();
        
        // SOURCE 2: Competitor Forging (External Market Analysis)
        const externalFitness = await this.evaluateMarketMisses();

        // Dynamic Weighting based on Regime
        let internalWeight = 0.6;
        
        // In high volatility, trust internal execution data more (safety)
        // In low volatility, look outward for missed opportunities (discovery)
        if (regime === 'HIGH_VOLATILITY') internalWeight = 0.8;
        if (regime === 'LOW_VOLATILITY') internalWeight = 0.4;

        // Calculate Total Fitness with dynamic weights
        const weightedInternal = internalFitness * internalWeight;
        const weightedExternal = externalFitness * (1 - internalWeight);
        const totalFitness = weightedInternal + weightedExternal;

        const selfLearningPct = totalFitness > 0 ? (weightedInternal / totalFitness) * 100 : 0;
        const competitorForgingPct = totalFitness > 0 ? (weightedExternal / totalFitness) * 100 : 0;

        // Evolution Logic
        if (totalFitness > this.bestFitness) {
            this.bestFitness = totalFitness;
            console.log(`[AI-OPTIMIZER] 🚀 New Theoretical Maximum found! Fitness: ${totalFitness.toFixed(4)}`);
            // Keep current weights, they are working
        } else {
            // Mutation: Current strategy is degrading or stagnant, mutate weights
            console.log('[AI-OPTIMIZER] 🧬 Performance stagnant. Mutating DNA...');
            this.mutateGenome();
        }

        // Apply new genome to Ranking Engine
        rankingEngine.updateWeights(this.currentGenome);
        
        this.evolutionHistory.push({
            generation: this.generation++,
            fitness: totalFitness,
            timestamp: Date.now(),
            source: internalFitness > externalFitness ? 'Self-Learning' : 'Competitor-Forging',
            regime: regime,
            composition: {
                selfLearning: selfLearningPct,
                competitorForging: competitorForgingPct
            }
        });

        // Keep history clean
        if (this.evolutionHistory.length > 100) this.evolutionHistory.shift();
    }

    /**
     * Source 1: Evaluate how well our current trades are performing.
     * Metric: Profit per trade * Win Rate
     */
    evaluateInternalPerformance() {
        const stats = profitEngine.getStatus().stats;
        
        if (!stats || stats.totalTrades === 0) return 0;

        const winRate = stats.successfulTrades / stats.totalTrades;
        const avgProfit = stats.totalProfit / stats.totalTrades;

        // Fitness Score = Win Rate * Avg Profit (ETH) * Scaling Factor
        // Example: 0.8 * 0.05 * 1000 = 40
        return winRate * avgProfit * 1000;
    }

    /**
     * Source 2: Look at opportunities we missed but the market took.
     * If high-volume pairs had low scores in our engine, our weights are wrong.
     */
    async evaluateMarketMisses() {
        const topPairs = rankingEngine.getTopPairs(10);
        
        // Get real competitor activity score (0-10)
        const competitorScore = await competitorAnalysis.getMarketMisses();

        let alignmentScore = 0;

        // We want our top ranked pairs to match high-volume market pairs
        for (const pair of topPairs) {
            // If a pair has high volume but we ranked it low (before sorting), that's a miss.
            // Since getTopPairs returns sorted, we check if high volume correlates with high score.
            if (pair.volume24h > 1000000 && pair.score > 80) {
                alignmentScore += 1;
            }
        }
        
        const internalAlignment = (alignmentScore / 10) * 10;
        
        // Combine internal alignment with external competitor activity
        return (internalAlignment + competitorScore) / 2;
    }

    /**
     * Genetic Mutation: Randomly adjust weights to find better local maxima.
     */
    mutateGenome() {
        const mutationRate = this.mutationRate;

        // Helper to mutate a single weight object
        const mutateCategory = (category) => {
            const newCat = { ...category };
            for (const key in newCat) {
                if (Math.random() > 0.5) {
                    const change = (Math.random() - 0.5) * mutationRate;
                    newCat[key] = Math.max(0, Math.min(1, newCat[key] + change));
                }
            }
            // Normalize
            const sum = Object.values(newCat).reduce((a, b) => a + b, 0);
            for (const key in newCat) {
                newCat[key] = newCat[key] / sum;
            }
            return newCat;
        };

        this.currentGenome = {
            chain: mutateCategory(this.currentGenome.chain),
            dex: mutateCategory(this.currentGenome.dex),
            pair: mutateCategory(this.currentGenome.pair)
        };
    }

    getState() {
        return {
            generation: this.generation,
            bestFitness: this.bestFitness,
            currentWeights: this.currentGenome,
            history: this.evolutionHistory.slice(-10), // Last 10 generations
            config: {
                mutationRate: this.mutationRate,
                optimizationInterval: this.optimizationInterval
            }
        };
    }
    
    triggerOptimization() {
        // Manual trigger for testing/demo
        this.evolve();
    }

    updateConfig(newConfig) {
        if (newConfig.mutationRate) this.mutationRate = parseFloat(newConfig.mutationRate);
        if (newConfig.optimizationInterval) {
            this.optimizationInterval = parseInt(newConfig.optimizationInterval);
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = setInterval(() => this.evolve(), this.optimizationInterval);
            }
        }
        console.log(`[AI-OPTIMIZER] Config updated: Rate=${this.mutationRate}, Interval=${this.optimizationInterval}`);
    }
}

module.exports = new AIAutoOptimizer();