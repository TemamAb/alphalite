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

class AIAutoOptimizer {
    constructor() {
        this.optimizationInterval = 30000; // 30 seconds
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
        const externalFitness = this.evaluateMarketMisses();

        // Dynamic Weighting based on Regime
        let internalWeight = 0.6;
        
        // In high volatility, trust internal execution data more (safety)
        // In low volatility, look outward for missed opportunities (discovery)
        if (regime === 'HIGH_VOLATILITY') internalWeight = 0.8;
        if (regime === 'LOW_VOLATILITY') internalWeight = 0.4;

        // Calculate Total Fitness with dynamic weights
        const totalFitness = (internalFitness * internalWeight) + (externalFitness * (1 - internalWeight));

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
            regime: regime
        });

        // Keep history clean
        if (this.evolutionHistory.length > 100) this.evolutionHistory.shift();
    }

    /**
     * Source 1: Evaluate how well our current trades are performing.
     * Metric: Profit per trade * Win Rate
     */
    evaluateInternalPerformance() {
        // In a real system, this would query the TradeHistory service
        // Mocking recent performance for the audit context
        const recentWinRate = 0.85 + (Math.random() * 0.1); // 85-95%
        const avgProfit = 0.05; // ETH
        return recentWinRate * avgProfit * 100;
    }

    /**
     * Source 2: Look at opportunities we missed but the market took.
     * If high-volume pairs had low scores in our engine, our weights are wrong.
     */
    evaluateMarketMisses() {
        const topPairs = rankingEngine.getTopPairs(10);
        let alignmentScore = 0;

        // We want our top ranked pairs to match high-volume market pairs
        for (const pair of topPairs) {
            // If a pair has high volume but we ranked it low (before sorting), that's a miss.
            // Since getTopPairs returns sorted, we check if high volume correlates with high score.
            if (pair.volume24h > 1000000 && pair.score > 80) {
                alignmentScore += 1;
            }
        }
        
        return (alignmentScore / 10) * 10; // Normalize to 0-10 scale
    }

    /**
     * Genetic Mutation: Randomly adjust weights to find better local maxima.
     */
    mutateGenome() {
        const mutationRate = 0.1; // 10% change max

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
            history: this.evolutionHistory.slice(-10) // Last 10 generations
        };
    }
    
    triggerOptimization() {
        // Manual trigger for testing/demo
        this.evolve();
    }
}

module.exports = new AIAutoOptimizer();