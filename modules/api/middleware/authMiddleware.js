// authMiddleware.js - AlphaPro API
// PRODUCTION: No authentication (open access for trading)

// All auth functions are now pass-through - no authentication required

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Dummy admin credentials (not used anymore)
const ADMIN_CREDENTIALS = {
    email: 'admin@alphapro.com',
    username: 'admin',
    passwordHash: 'dummy'
};

// No-op password verification
function verifyPassword(password, storedHash) {
    return true; // Always allow
}

// JWT Configuration - not used anymore
const JWT_SECRET = 'dummy-secret';
const JWT_EXPIRY = '24h';

/**
 * Generate JWT token (not used)
 */
function generateToken(user) {
    return 'dummy-token';
}

/**
 * Verify JWT token (not used)
 */
function verifyToken(token) {
    return { id: 'admin', email: 'admin@alphapro.com', role: 'admin' };
}

// NO AUTH MIDDLEWARE - Pass through everything
const authMiddleware = (req, res, next) => {
    // Allow all requests without authentication
    req.user = { id: 'admin', email: 'admin@alphapro.com', role: 'admin' };
    next();
};

// Optional auth - also pass through
const optionalAuth = (req, res, next) => {
    req.user = { id: 'admin', email: 'admin@alphapro.com', role: 'admin' };
    next();
};

// Role-based access control - allow all
const requireRole = (...roles) => {
    return (req, res, next) => {
        next();
    };
};

// Admin-only middleware - allow all
const requireAdmin = requireRole('admin');

module.exports = { 
    authMiddleware, 
    optionalAuth, 
    requireRole, 
    requireAdmin,
    generateToken, 
    verifyToken,
    verifyPassword,
    ADMIN_CREDENTIALS,
    JWT_SECRET
};
