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

/**
 * @route GET /api/metrics/api
 * @desc Get API metrics - uptime, requests, etc
 */
router.get('/api', (req, res) => {
    try {
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();
        res.json({
            uptime: uptime,
            requests: {
                total: 0,
                success: 0,
                failed: 0
            },
            latency: {
                avg: 0,
                p50: 0,
                p95: 0,
                p99: 0
            },
            errors: {
                total: 0,
                byType: {}
            },
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('[METRICS-API] Failed to get API metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /api/metrics/system
 * @desc Get system health metrics
 */
router.get('/system', (req, res) => {
    try {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        res.json({
            status: 'healthy',
            uptime: process.uptime(),
            memory: {
                rss: memoryUsage.rss,
                heapTotal: memoryUsage.heapTotal,
                heapUsed: memoryUsage.heapUsed,
                external: memoryUsage.external
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('[METRICS-API] Failed to get system metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /api/metrics/history
 * @desc Get historical metrics data
 */
router.get('/history', (req, res) => {
    try {
        const { from, to, interval } = req.query;
        // Return mock historical data - in production this would come from a database
        const now = Date.now();
        const fromTime = from ? new Date(from).getTime() : now - 24 * 60 * 60 * 1000;
        const toTime = to ? new Date(to).getTime() : now;
        const intervalMs = (interval === '1m' ? 1 : interval === '5m' ? 5 : interval === '1h' ? 60 : 1) * 60 * 1000;
        
        const history = [];
        for (let t = fromTime; t <= toTime; t += intervalMs) {
            history.push({
                timestamp: t,
                value: Math.random() * 100
            });
        }
        
        res.json(history);
    } catch (error) {
        console.error('[METRICS-API] Failed to get historical metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
