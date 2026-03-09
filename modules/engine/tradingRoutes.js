const express = require('express');
const router = express.Router();
const tradeAuditService = require('../services/TradeAuditService');

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

module.exports = router;