// authMiddleware.js - Authentication middleware for API routes
// NO AUTH VERSION: All requests pass through without authentication
// For production deployment - authentication handled at infrastructure level

// No-op middleware - always calls next()
const authMiddleware = (req, res, next) => {
    // Set a default admin user for all requests
    req.user = { id: 'admin', email: 'admin@alphapro.com', role: 'admin' };
    next();
};

// Optional auth - doesn't fail if no token
const optionalAuth = (req, res, next) => {
    req.user = { id: 'admin', email: 'admin@alphapro.com', role: 'admin' };
    next();
};

// Role-based access control - simplified, always allows
const requireRole = (...roles) => {
    return (req, res, next) => {
        // Always allow - admin role assigned above
        req.user = { id: 'admin', email: 'admin@alphapro.com', role: 'admin' };
        next();
    };
};

// Dummy JWT_SECRET for any code that might reference it
const JWT_SECRET = 'no-auth-required';
const getSecret = () => 'no-auth-required';

module.exports = { authMiddleware, optionalAuth, requireRole, JWT_SECRET, getSecret };
