const express = require('express');
const router = express.Router();
const tradeAuditService = require('../api/services/TradeAuditService');
const engine = require('./EnterpriseProfitEngine');
const PreFlightCheckService = require('../../PreFlightCheck');

/**
 * GET /engine/stats
 * Retrieve current engine statistics.
 */
router.get('/engine/stats', (req, res) => {
    try {
        // The getStatus() method in the engine provides a comprehensive overview.
        const status = engine.getStatus();
        res.status(200).json(status);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve engine stats.' });
    }
});

/**
 * GET /rankings
 * Retrieve full pair and chain rankings from the RankingEngine.
 */
router.get('/rankings', (req, res) => {
    try {
        const rankings = engine.getRankings();
        res.status(200).json(rankings);
    } catch (error) {
        console.error('[API] Error fetching rankings:', error);
        res.status(200).json({ 
            timestamp: Date.now(), 
            topChains: [], 
            topDexes: [], 
            topPairs: [],
            summary: { totalChains: 0, totalDexes: 0, totalPairs: 0 }
        });
    }
});

/**
 * GET /rankings/opportunity
 * Retrieve the single best opportunity currently identified by the RankingEngine.
 */
router.get('/rankings/opportunity', (req, res) => {
    try {
        const opportunity = engine.getRankedOpportunity();
        res.status(200).json(opportunity || {});
    } catch (error) {
        console.error('[API] Error fetching opportunity:', error);
        res.status(200).json({});
    }
});

/**
 * GET /history
 * Retrieve trade execution history with pagination and filtering.
 * Protected by authMiddleware (applied globally to /api in app.js).
 */
router.get('/history', async (req, res) => {
    try {
        const { page, limit, strategy, status } = req.query;

        const history = await tradeAuditService.getTradeHistory({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 50,
            strategy,
            status
        });

        res.status(200).json(history);
    } catch (error) {
        console.error('[API] Error fetching trade history:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve trade history',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /preflight
 * Runs a pre-flight check of all critical infrastructure.
 */
router.get('/preflight', async (req, res) => {
    try {
        const results = await PreFlightCheckService.runAllChecks();
        res.status(results.allOk ? 200 : 503).json(results);
    } catch (error) {
        res.status(500).json({ error: 'Preflight check failed unexpectedly.' });
    }
});

module.exports = router;