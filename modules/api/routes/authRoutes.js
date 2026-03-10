// authRoutes.js - Authentication endpoints for AlphaPro
// NO AUTH VERSION: Simplified for deployment - no JWT required

const express = require('express');
const router = express.Router();

// Dummy responses for login/register - always succeeds
// In production, these can be connected to a real auth system

// POST /api/auth/register - Register new user (dummy)
router.post('/register', async (req, res) => {
    // Always return success for deployment
    res.status(201).json({
        message: 'User registered successfully',
        user: {
            id: 'admin',
            email: 'admin@alphapro.com',
            username: 'admin',
            role: 'admin'
        }
    });
});

// POST /api/auth/login - Authenticate user (dummy)
router.post('/login', async (req, res) => {
    // Always return success for deployment
    res.json({
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

// POST /api/auth/refresh - Refresh token (dummy)
router.post('/refresh', async (req, res) => {
    res.json({
        token: 'no-auth-required',
        expiresIn: 86400
    });
});

// POST /api/auth/logout - Logout user
router.post('/logout', (req, res) => {
    res.json({
        message: 'Logout successful'
    });
});

// GET /api/auth/me - Get current user info
router.get('/me', (req, res) => {
    res.json({
        user: {
            id: 'admin',
            email: 'admin@alphapro.com',
            username: 'admin',
            role: 'admin'
        }
    });
});

module.exports = router;
