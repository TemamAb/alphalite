// authMiddleware.js - AlphaPro API
// PRODUCTION: JWT Authentication with Role-Based Access Control

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const configService = require('../../../config/configService');

// --- Admin Credentials ---
// Load from config service (which reads from Render env vars or .env file)
// Fall back to hardcoded defaults if not configured
const ADMIN_CREDENTIALS = {
    id: '1',
    email: configService.config.auth?.adminEmail || process.env.ADMIN_EMAIL || 'iamtemam@gmail.com',
    username: configService.config.auth?.adminEmail || process.env.ADMIN_EMAIL || 'iamtemam@gmail.com',
    // Use config service hash, then env var, then hardcoded default
    passwordHash: configService.config.auth?.adminPasswordHash || process.env.ADMIN_PASSWORD_HASH || '$2b$12$EHjRMYpfJVsqFmZ.avN80OUZsLm7UoQY3S6euIZxrd3bkTWA6eR16',
    role: 'admin'
};

// --- JWT Configuration ---
// Use environment variable for secret in production, with a secure fallback.
const JWT_SECRET = configService.config.auth?.jwtSecret || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRY = '24h';

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 * @param {string} password The plaintext password from user input.
 * @param {string} storedHash The hashed password from the database/store.
 * @returns {Promise<boolean>} True if the password is valid.
 */
async function verifyPassword(password, storedHash) {
    if (!password || !storedHash) return false;
    return await bcrypt.compare(password, storedHash);
}

/**
 * Generate a JWT token for a given user.
 * @param {object} user - The user object to encode in the token.
 * @returns {string} The generated JWT.
 */
function generateToken(user) {
    const payload = { id: user.id, email: user.email, role: user.role };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify a JWT token from the request.
 * @param {string} token - The JWT token.
 * @returns {object|null} The decoded user payload or null if invalid.
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// --- Middleware ---

/**
 * Authentication middleware to protect routes.
 * Verifies the JWT from the Authorization header.
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required: No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = decoded;
    return next();
};

/**
 * Role-based access control middleware.
 * @param  {...string} roles - The roles allowed to access the route.
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Access denied. Requires one of: ${roles.join(', ')}` });
        }
        return next();
    };
};

/**
 * Middleware to require admin role.
 */
const requireAdmin = requireRole('admin');

module.exports = {
    authMiddleware,
    requireRole,
    requireAdmin,
    generateToken,
    verifyToken,
    verifyPassword,
    ADMIN_CREDENTIALS,
    JWT_SECRET
};
