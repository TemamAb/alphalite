// authRoutes.js - AlphaPro Authentication
// PRODUCTION: No authentication - open access enabled

const express = require('express');
const router = express.Router();

// POST /api/auth/login - No authentication required
router.post('/login', async (req, res) => {
    // Accept any login - no authentication needed
    return res.json({
        success: true,
        message: 'Login successful',
        token: 'no-auth-required',
        refreshToken: 'no-auth-required',
        user: {
            id: 'admin',
            email: 'admin@alphapro.com',
            username: 'admin',
            role: 'admin'
        },
        expiresIn: 86400
    });
});

// POST /api/auth/register - Registration disabled
router.post('/register', async (req, res) => {
    res.status(403).json({
        error: 'Registration is disabled. Open access enabled.',
        code: 'REGISTRATION_DISABLED'
    });
});

// POST /api/auth/refresh - No auth required
router.post('/refresh', (req, res) => {
    res.json({
        success: true,
        token: 'no-auth-required',
        expiresIn: 86400
    });
});

// POST /api/auth/logout - No auth required
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// GET /api/auth/me - No auth required
router.get('/me', (req, res) => {
    res.json({
        success: true,
        user: {
            id: 'admin',
            email: 'admin@alphapro.com',
            username: 'admin',
            role: 'admin'
        }
    });
});

// POST /api/auth/change-password - No auth required
router.post('/change-password', async (req, res) => {
    res.json({
        success: true,
        message: 'Password change not needed - open access enabled'
    });
});

module.exports = router;
