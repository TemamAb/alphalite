// authRoutes.js - AlphaPro Authentication
// PRODUCTION: Open access - no authentication required

const express = require('express');
const router = express.Router();

/**
 * @route POST /api/auth/login
 * @desc Open access - always returns success
 * @access Public - No authentication required
 */
router.post('/login', (req, res) => {
    // Return success - no authentication required
    res.json({
        success: true,
        message: 'Access granted',
        user: {
            id: '1',
            email: 'guest@alphapro.com',
            username: 'guest',
            role: 'admin'
        }
    });
});

/**
 * @route GET /api/auth/status
 * @desc Check auth status - always returns authenticated
 * @access Public
 */
router.get('/status', (req, res) => {
    res.json({
        authenticated: true,
        user: {
            id: '1',
            email: 'guest@alphapro.com',
            role: 'admin'
        }
    });
});

/**
 * @route POST /api/auth/logout
 * @desc Logout - no-op
 * @access Public
 */
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out'
    });
});

/**
 * @route GET /api/auth/me
 * @desc Get current user - returns guest
 * @access Public
 */
router.get('/me', (req, res) => {
    res.json({
        success: true,
        user: {
            id: '1',
            email: 'guest@alphapro.com',
            username: 'guest',
            role: 'admin'
        }
    });
});

module.exports = router;

