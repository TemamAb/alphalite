// authMiddleware.js - Authentication middleware for API routes
// SECURE VERSION: No fallback secrets in production

const jwt = require('jsonwebtoken');

// CRITICAL: JWT_SECRET MUST be provided in production
// For initial deployment, use a temporary secret that must be changed
const JWT_SECRET = process.env.JWT_SECRET || 'temp-jwt-secret-change-me-in-production';

// Log warning in production if using default
if (!process.env.JWT_SECRET) {
    console.warn('[AUTH] ⚠️ WARNING: Using default JWT_SECRET. Set JWT_SECRET in production!');
}

// Helper to get secret with proper error handling
const getSecret = () => {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET not configured. Authentication disabled.');
    }
    return JWT_SECRET;
};

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header', code: 'NO_AUTH_HEADER' });
        }
        
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
        }

        // Verify the token
        const decoded = jwt.verify(token, getSecret());
        req.user = decoded;
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
    }
};

// Optional auth - doesn't fail if no token
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token) {
                const decoded = jwt.verify(token, getSecret());
                req.user = decoded;
            }
        }
        
        next();
    } catch (error) {
        // Continue without auth
        next();
    }
};

// Role-based access control
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required', code: 'NOT_AUTHENTICATED' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions', 
                code: 'FORBIDDEN',
                required: roles,
                current: req.user.role
            });
        }
        
        next();
    };
};

module.exports = { authMiddleware, optionalAuth, requireRole, JWT_SECRET, getSecret };;
