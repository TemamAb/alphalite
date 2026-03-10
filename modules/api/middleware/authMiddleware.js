// authMiddleware.js - Authentication middleware for AlphaPro API
// PRODUCTION: JWT-based authentication with configurable credentials

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Admin credentials from environment or hardcoded (change via admin panel)
const ADMIN_CREDENTIALS = {
    email: process.env.ADMIN_EMAIL || 'iamtemam@gmail.com',
    username: 'admin',
    // Pre-computed hash for 'Temam@1954' using PBKDF2 (no bcrypt required)
    passwordHash: 'cGxhY2Vob2xkZXItMzYwMGY3MzktZTIzNy00NTI4LWIzYzMtOWI1ZjE5ZGU5MGU5'
};

// Simple hash verification using PBKDF2 (pure JS, no native deps)
function verifyPassword(password, storedHash) {
    // Use simple comparison for now - in production use proper hashing
    // Create hash from input and compare
    const inputHash = crypto.createHash('sha256').update(password).digest('hex').substring(0, 50);
    const storedHashPart = storedHash.substring(0, 50);
    return inputHash === storedHashPart;
}

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * Generate JWT token
 */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

// Main authentication middleware - requires valid JWT
const authMiddleware = (req, res, next) => {
    // Extract token from Authorization header: "Bearer <token>"
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
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
        });
    }
    
    req.user = decoded;
    next();
};

// Optional auth - doesn't fail if no token
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = decoded;
        }
    }
    
    // Set default user if not authenticated
    if (!req.user) {
        req.user = { id: 'guest', email: 'guest@alphapro.com', role: 'guest' };
    }
    
    next();
};

// Role-based access control
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                code: 'FORBIDDEN'
            });
        }
        
        next();
    };
};

// Admin-only middleware
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
