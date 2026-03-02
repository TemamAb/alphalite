/**
 * AlphaPro Real-Time Ranking Engine
 * Dynamically ranks chains, DEXs, and trading pairs by profitability
 * Uses multi-factor scoring to maximize arbitrage opportunities
 */

const EventEmitter = require('events');

class RankingEngine extends EventEmitter {
    constructor() {
        super();
        
        // Real-time rankings storage
        this.chainRankings = new Map();
        this.dexRankings = new Map();
        this.pairRankings = new Map();
        
        // Historical performance data
        this.profitHistory = new Map();
        this.volumeHistory = new Map();
        this.opportunityHistory = new Map();
        
        // Scoring weights (can be adjusted dynamically)
        this.weights = {
            chain: {
                profitWeight: 0.35,
                volumeWeight: 0.25,
                opportunityWeight: 0.25,
                reliabilityWeight: 0.15
            },
            dex: {
                liquidityWeight: 0.30,
                volumeWeight: 0.25,
                feeWeight: 0.20,
                reliabilityWeight: 0.25
            },
            pair: {
                spreadWeight: 0.30,
                frequencyWeight: 0.25,
                volumeWeight: 0.25,
                profitWeight: 0.20
            }
        };
        
        // Initialize default rankings
        this.initializeRankings();
        
        // Update interval
        this.updateInterval = 60000; // 1 minute
        this.startAutoUpdate();
    }
    
    initializeRankings() {
        // Initialize chain rankings with baseline scores
        const defaultChains = [
            { id: 'ethereum', name: 'Ethereum', baseScore: 95 },
            { id: 'arbitrum', name: 'Arbitrum', baseScore: 90 },
            { id: 'optimism', name: 'Optimism', baseScore: 88 },
            { id: 'polygon', name: 'Polygon', baseScore: 85 },
            { id: 'base', name: 'Base', baseScore: 82 },
            { id: 'avalanche', name: 'Avalanche', baseScore: 80 },
            { id: 'bsc', name: 'BNB Chain', baseScore: 78 },
            { id: 'fantom', name: 'Fantom', baseScore: 75 },
            { id: 'scroll', name: 'Scroll', baseScore: 72 },
            { id: 'linea', name: 'Linea', baseScore: 70 },
            { id: 'zora', name: 'Zora', baseScore: 68 },
            { id: 'mantle', name: 'Mantle', baseScore: 65 },
            { id: 'gnosis', name: 'Gnosis', baseScore: 60 },
            { id: 'celo', name: 'Celo', baseScore: 55 },
            { id: 'kava', name: 'Kava', baseScore: 50 },
            { id: 'moonbeam', name: 'Moonbeam', baseScore: 45 },
            { id: 'astar', name: 'Astar', baseScore: 40 },
            { id: 'cronos', name: 'Cronos', baseScore: 35 },
            { id: 'solana', name: 'Solana', baseScore: 30 },
            { id: 'starknet', name: 'Starknet', baseScore: 25 },
            { id: 'aptos', name: 'Aptos', baseScore: 20 },
            { id: 'near', name: 'Near', baseScore: 15 },
            { id: 'injective', name: 'Injective', baseScore: 12 },
            { id: 'sei', name: 'Sei', baseScore: 10 },
            { id: 'osmosis', name: 'Osmosis', baseScore: 8 }
        ];
        
        defaultChains.forEach(chain => {
            this.chainRankings.set(chain.id, {
                ...chain,
                score: chain.baseScore,
                profit24h: 0,
                volume24h: 0,
                opportunitiesCount: 0,
                reliability: 0.99,
                lastUpdate: Date.now()
            });
        });
        
        // Initialize DEX rankings
        const defaultDexes = [
            { id: 'uniswap_v3', chain: 'ethereum', baseScore: 95 },
            { id: 'sushiswap', chain: 'ethereum', baseScore: 90 },
            { id: 'curve', chain: 'ethereum', baseScore: 88 },
            { id: 'balancer', chain: 'ethereum', baseScore: 85 },
            { id: 'uniswap_v3', chain: 'arbitrum', baseScore: 92 },
            { id: 'camelot', chain: 'arbitrum', baseScore: 88 },
            { id: 'uniswap_v3', chain: 'optimism', baseScore: 90 },
            { id: 'velodrome', chain: 'optimism', baseScore: 86 },
            { id: 'quickswap', chain: 'polygon', baseScore: 88 },
            { id: 'uniswap_v3', chain: 'polygon', baseScore: 85 },
            { id: 'aerodrome', chain: 'base', baseScore: 90 },
            { id: 'pancakeswap', chain: 'bsc', baseScore: 92 },
            { id: 'traderjoe', chain: 'avalanche', baseScore: 90 },
            { id: 'spiritswap', chain: 'fantom', baseScore: 85 },
            { id: 'zebra', chain: 'scroll', baseScore: 80 }
        ];
        
        defaultDexes.forEach(dex => {
            this.dexRankings.set(`${dex.chain}_${dex.id}`, {
                ...dex,
                score: dex.baseScore,
                liquidity24h: 0,
                volume24h: 0,
                avgFee: 0.003,
                reliability: 0.98,
                lastUpdate: Date.now()
            });
        });
    }
    
    /**
     * Update chain rankings based on real-time data
     */
    async updateChainRankings(chainData) {
        for (const [chainId, data] of Object.entries(chainData)) {
            const current = this.chainRankings.get(chainId);
            if (!current) continue;
            
            // Calculate new score
            const profitScore = this.calculateProfitScore(data.profit24h);
            const volumeScore = this.calculateVolumeScore(data.volume24h);
            const opportunityScore = this.calculateOpportunityScore(data.opportunitiesCount);
            const reliabilityScore = data.reliability || 0.99;
            
            const newScore = 
                (profitScore * this.weights.chain.profitWeight) +
                (volumeScore * this.weights.chain.volumeWeight) +
                (opportunityScore * this.weights.chain.opportunityWeight) +
                (reliabilityScore * 100 * this.weights.chain.reliabilityWeight);
            
            // Apply momentum (smoothing)
            const momentum = 0.7;
            const finalScore = (current.score * momentum) + (newScore * (1 - momentum));
            
            this.chainRankings.set(chainId, {
                ...current,
                score: Math.min(100, Math.max(0, finalScore)),
                profit24h: data.profit24h || current.profit24h,
                volume24h: data.volume24h || current.volume24h,
                opportunitiesCount: data.opportunitiesCount || current.opportunitiesCount,
                reliability: data.reliability || current.reliability,
                lastUpdate: Date.now()
            });
        }
        
        this.emit('chainRankingsUpdated', this.getSortedChains());
    }
    
    /**
     * Update DEX rankings based on real-time data
     */
    async updateDexRankings(dexData) {
        for (const [dexKey, data] of Object.entries(dexData)) {
            const current = this.dexRankings.get(dexKey);
            if (!current) continue;
            
            // Calculate new score
            const liquidityScore = this.calculateLiquidityScore(data.liquidity24h);
            const volumeScore = this.calculateVolumeScore(data.volume24h);
            const feeScore = (1 - data.avgFee) * 100;
            const reliabilityScore = (data.reliability || 0.98) * 100;
            
            const newScore = 
                (liquidityScore * this.weights.dex.liquidityWeight) +
                (volumeScore * this.weights.dex.volumeWeight) +
                (feeScore * this.weights.dex.feeWeight) +
                (reliabilityScore * this.weights.dex.reliabilityWeight);
            
            // Apply momentum
            const momentum = 0.8;
            const finalScore = (current.score * momentum) + (newScore * (1 - momentum));
            
            this.dexRankings.set(dexKey, {
                ...current,
                score: Math.min(100, Math.max(0, finalScore)),
                liquidity24h: data.liquidity24h || current.liquidity24h,
                volume24h: data.volume24h || current.volume24h,
                avgFee: data.avgFee || current.avgFee,
                reliability: data.reliability || current.reliability,
                lastUpdate: Date.now()
            });
        }
        
        this.emit('dexRankingsUpdated', this.getSortedDexes());
    }
    
    /**
     * Update trading pair rankings based on arbitrage opportunities
     */
    async updatePairRankings(pairData) {
        for (const [pairKey, data] of Object.entries(pairData)) {
            // Calculate spread score (higher spread = higher score)
            const spreadScore = Math.min(100, data.avgSpreadBps * 10);
            
            // Frequency score (more opportunities = better)
            const frequencyScore = Math.min(100, data.opportunityFrequency * 10);
            
            // Volume score
            const volumeScore = this.calculateVolumeScore(data.volume24h);
            
            // Historical profit score
            const profitScore = this.calculateProfitScore(data.profit24h);
            
            const newScore = 
                (spreadScore * this.weights.pair.spreadWeight) +
                (frequencyScore * this.weights.pair.frequencyWeight) +
                (volumeScore * this.weights.pair.volumeWeight) +
                (profitScore * this.weights.pair.profitWeight);
            
            this.pairRankings.set(pairKey, {
                pair: pairKey,
                score: Math.min(100, Math.max(0, newScore)),
                avgSpreadBps: data.avgSpreadBps || 0,
                opportunityFrequency: data.opportunityFrequency || 0,
                volume24h: data.volume24h || 0,
                profit24h: data.profit24h || 0,
                lastOpportunity: data.lastOpportunity || null,
                lastUpdate: Date.now()
            });
        }
        
        this.emit('pairRankingsUpdated', this.getSortedPairs());
    }
    
    /**
     * Get top N chains by profitability
     */
    getTopChains(count = 10) {
        return this.getSortedChains().slice(0, count);
    }
    
    /**
     * Get sorted chains by score
     */
    getSortedChains() {
        return Array.from(this.chainRankings.values())
            .sort((a, b) => b.score - a.score);
    }
    
    /**
     * Get top DEXs for a specific chain
     */
    getTopDexes(chainId, count = 5) {
        return this.getSortedDexes(chainId).slice(0, count);
    }
    
    /**
     * Get sorted DEXs by score
     */
    getSortedDexes(chainId = null) {
        let dexes = Array.from(this.dexRankings.values());
        if (chainId) {
            dexes = dexes.filter(d => d.chain === chainId);
        }
        return dexes.sort((a, b) => b.score - a.score);
    }
    
    /**
     * Get top trading pairs by profitability
     */
    getTopPairs(count = 20) {
        return this.getSortedPairs().slice(0, count);
    }
    
    /**
     * Get sorted pairs by score
     */
    getSortedPairs() {
        return Array.from(this.pairRankings.values())
            .sort((a, b) => b.score - a.score);
    }
    
    /**
     * Get best opportunity across all pairs
     */
    getBestOpportunity() {
        const topPairs = this.getTopPairs(10);
        if (topPairs.length === 0) return null;
        
        // Get the highest scoring pair
        return topPairs[0];
    }
    
    /**
     * Get recommended chain for next trade
     */
    getRecommendedChain() {
        const topChains = this.getTopChains(3);
        if (topChains.length === 0) return null;
        
        // Return top chain with highest score
        return topChains[0];
    }
    
    /**
     * Get recommended DEX for a chain
     */
    getRecommendedDex(chainId) {
        const topDexes = this.getTopDexes(chainId, 3);
        if (topDexes.length === 0) return null;
        
        return topDexes[0];
    }
    
    /**
     * Calculate profit score (0-100)
     */
    calculateProfitScore(profit) {
        if (profit <= 0) return 0;
        // Logarithmic scaling for profit
        return Math.min(100, Math.log10(profit + 1) * 20);
    }
    
    /**
     * Calculate volume score (0-100)
     */
    calculateVolumeScore(volume) {
        if (volume <= 0) return 0;
        // Logarithmic scaling for volume
        return Math.min(100, Math.log10(volume + 1) * 15);
    }
    
    /**
     * Calculate opportunity frequency score (0-100)
     */
    calculateOpportunityScore(count) {
        if (count <= 0) return 0;
        return Math.min(100, count * 2);
    }
    
    /**
     * Calculate liquidity score (0-100)
     */
    calculateLiquidityScore(liquidity) {
        if (liquidity <= 0) return 0;
        return Math.min(100, Math.log10(liquidity + 1) * 12);
    }
    
    /**
     * Update scoring weights dynamically
     */
    updateWeights(newWeights) {
        this.weights = { ...this.weights, ...newWeights };
        this.emit('weightsUpdated', this.weights);
    }
    
    /**
     * Start auto-update cycle
     */
    startAutoUpdate() {
        this.autoUpdateTimer = setInterval(async () => {
            await this.performAutoUpdate();
        }, this.updateInterval);
    }
    
    /**
     * Perform automatic ranking update
     */
    async performAutoUpdate() {
        try {
            // Fetch latest data from data sources
            // This would integrate with APIs like DexScreener, Birdeye, etc.
            
            // For now, simulate with slight variations
            this.simulateMarketMovement();
            
            // Emit update events
            this.emit('autoUpdateComplete', {
                chains: this.getSortedChains(),
                dexes: this.getSortedDexes(),
                pairs: this.getSortedPairs()
            });
        } catch (error) {
            console.error('[RANKING] Auto-update error:', error);
        }
    }
    
    /**
     * Simulate market movements for testing
     */
    simulateMarketMovement() {
        // Add some random variation to scores
        for (const [key, chain] of this.chainRankings) {
            const variation = (Math.random() - 0.5) * 2;
            chain.score = Math.max(0, Math.min(100, chain.score + variation));
        }
        
        for (const [key, dex] of this.dexRankings) {
            const variation = (Math.random() - 0.5) * 3;
            dex.score = Math.max(0, Math.min(100, dex.score + variation));
        }
    }
    
    /**
     * Get full ranking report
     */
    getRankingReport() {
        return {
            timestamp: Date.now(),
            topChains: this.getTopChains(10),
            topDexes: this.getTopDexes(null, 15),
            topPairs: this.getTopPairs(20),
            weights: this.weights,
            summary: {
                totalChains: this.chainRankings.size,
                totalDexes: this.dexRankings.size,
                totalPairs: this.pairRankings.size,
                bestOpportunity: this.getBestOpportunity(),
                recommendedChain: this.getRecommendedChain()
            }
        };
    }
    
    /**
     * Stop the ranking engine
     */
    stop() {
        if (this.autoUpdateTimer) {
            clearInterval(this.autoUpdateTimer);
        }
    }
}

module.exports = new RankingEngine();
