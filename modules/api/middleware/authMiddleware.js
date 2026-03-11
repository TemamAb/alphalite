// authMiddleware.js - AlphaPro API
// PRODUCTION: Authentication disabled - Open access for all routes

/**
 * Authentication middleware - DISABLED
 * All routes are now public and accessible without login
 */
const authMiddleware = (req, res, next) => {
    // Bypass all authentication - open access
    return next();
};

/**
 * Role-based access control middleware - DISABLED
 * All roles allowed
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        return next();
    };
};

/**
 * Middleware to require admin role - DISABLED
 */
const requireAdmin = requireRole('admin');

module.exports = {
    authMiddleware,
    requireRole,
    requireAdmin
};

