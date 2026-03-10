// authRoutes.js - Authentication endpoints for AlphaPro
// PRODUCTION: JWT-based authentication with proper password verification

const express = require('express');
const router = express.Router();
const { 
    generateToken, 
    verifyToken, 
    verifyPassword, 
    ADMIN_CREDENTIALS 
} = require('../middleware/authMiddleware');

// POST /api/auth/login - Authenticate user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }
        
        // Check against admin credentials
        if (email === ADMIN_CREDENTIALS.email) {
            // Synchronous password verification
            const isValid = verifyPassword(password, ADMIN_CREDENTIALS.passwordHash);
            
            if (isValid) {
                const token = generateToken({
                    id: 'admin',
                    email: ADMIN_CREDENTIALS.email,
                    username: ADMIN_CREDENTIALS.username,
                    role: 'admin'
                });
                
                return res.json({
                    success: true,
                    message: 'Login successful',
                    token,
                    refreshToken: token,
                    user: {
                        id: 'admin',
                        email: ADMIN_CREDENTIALS.email,
                        username: ADMIN_CREDENTIALS.username,
                        role: 'admin'
                    },
                    expiresIn: 86400
                });
            }
        }
        
        // Invalid credentials
        return res.status(401).json({ 
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS'
        });
        
    } catch (error) {
        console.error('[AUTH] Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/register - Register new user (admin only in production)
router.post('/register', async (req, res) => {
    // In production, this should be restricted to admin only
    // For now, return a message that registration is disabled
    res.status(403).json({
        error: 'Registration is disabled. Contact administrator.',
        code: 'REGISTRATION_DISABLED'
    });
});

// POST /api/auth/refresh - Refresh token
router.post('/refresh', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: 'Token required',
            code: 'NO_TOKEN'
        });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(403).json({ 
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }
    
    // Generate new token
    const newToken = generateToken({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
    });
    
    res.json({
        success: true,
        token: newToken,
        expiresIn: 86400
    });
});

// POST /api/auth/logout - Logout user
router.post('/logout', (req, res) => {
    // In a more complete implementation, we'd invalidate the token
    // For JWT, client-side logout is typical (remove token from storage)
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// GET /api/auth/me - Get current user info
router.get('/me', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: 'Authentication required',
            code: 'NO_TOKEN'
        });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(403).json({ 
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }
    
    res.json({
        success: true,
        user: decoded
    });
});

// POST /api/auth/change-password - Change admin password (requires admin)
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const authHeader = req.headers.authorization;
        
        // Verify current authentication
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'NO_TOKEN'
            });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (!decoded || decoded.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Admin access required',
                code: 'FORBIDDEN'
            });
        }
        
        // Verify current password
        const isValid = await verifyPassword(currentPassword, ADMIN_CREDENTIALS.passwordHash);
        if (!isValid) {
            return res.status(400).json({ 
                error: 'Current password is incorrect',
                code: 'INVALID_PASSWORD'
            });
        }
        
        // In production, this would update the database
        // For now, require environment variable update
        res.json({
            success: true,
            message: 'Password change requires server restart. Set ADMIN_PASSWORD_HASH environment variable.'
        });
        
    } catch (error) {
        console.error('[AUTH] Password change error:', error);
        res.status(500).json({ error: 'Password change failed' });
    }
});

module.exports = router;
