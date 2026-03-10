// authMiddleware.js - AlphaPro API
// PRODUCTION: JWT Authentication with Role-Based Access Control

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// --- Admin Credentials ---
// As per DEPLOYMENT_AUDIT_FINAL.md, these are the primary credentials.
// The password hash is pre-generated for 'Temam@1954'.
const ADMIN_CREDENTIALS = {
    id: '1',
    email: 'iamtemam@gmail.com',
    username: 'admin',
    // Pre-hashed password for "Temam@1954" with salt rounds 12
    passwordHash: '$2b$12$.vU9XtbzvBkQlbj/kP9PUelKRLBbsJD9dIYnuUelEGPusWVn0ZQnS',
    role: 'admin'
};

// --- JWT Configuration ---
// Use environment variable for secret in production, with a secure fallback.
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
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
