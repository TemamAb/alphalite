const express = require('express');
const router = express.Router();
const rankingEngine = require('../../engine/services/RankingEngine');
const liquidityAggregator = require('../../engine/services/LiquidityAggregator');
const whaleWatcher = require('../../engine/services/WhaleWatcher');

/**
 * @route GET /api/metrics/volatility
 * @desc Get current market volatility and turbo mode status
 */
router.get('/volatility', (req, res) => {
    try {
        const volatilityIndex = rankingEngine.currentVolatilityIndex || 0;
        res.json({
            index: volatilityIndex,
            turboMode: volatilityIndex > 70,
            trend: 'stable',
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('[METRICS-API] Failed to get volatility:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /api/metrics/liquidity
 * @desc Get aggregated flash loan liquidity across major protocols
 */
router.get('/liquidity', async (req, res) => {
    try {
        // Use USDC on Ethereum as the baseline for liquidity display
        const USDC_ETH = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
        const data = await liquidityAggregator.getTotalLiquidity(USDC_ETH, 'ethereum');

        // Ensure sources have maxCapacity for the UI progress bar
        const enrichedSources = data.sources.map(s => ({
            ...s,
            maxCapacity: s.name === 'Aave V3' ? 500000000 : 100000000 // Real-world baseline
        }));

        res.json({
            ...data,
            sources: enrichedSources
        });
    } catch (error) {
        console.error('[METRICS-API] Failed to get liquidity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /api/metrics/whales
 * @desc Get history of detected whale movements and competitors
 */
router.get('/whales', (req, res) => {
    try {
        const whales = whaleWatcher.getDetectedWhales();
        res.json(whales);
    } catch (error) {
        console.error('[METRICS-API] Failed to get whales:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
