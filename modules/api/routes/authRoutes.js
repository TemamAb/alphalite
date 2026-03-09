
// authRoutes.js - Authentication endpoints for AlphaPro
// PRODUCTION: Complete authentication with JWT tokens

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { getSecret, authMiddleware } = require('../middleware/authMiddleware');
const databaseService = require('../services/DatabaseService');

// IA-3 FIX: The volatile in-memory user store has been removed.
// All user operations are now handled by the persistent DatabaseService.

// ============ VALIDATION SCHEMAS ============
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('admin', 'trader', 'viewer').default('trader')
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// ============ MIDDLEWARE ============
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            
            return res.status(400).json({
                error: 'Validation failed',
                details: errors,
                code: 'VALIDATION_ERROR'
            });
        }

        req.body = value;
        next();
    };
};

// ============ ROUTES ============

// POST /api/auth/register - Register new user
router.post('/register', validateRequest(registerSchema), async (req, res) => {
    try {
        const { email, username, password, role } = req.body;

        await databaseService.connect();

        // Check if user exists
        const existingUser = await databaseService.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: 'User already exists',
                code: 'USER_EXISTS'
            });
        }

        // Determine if this is the first user to assign admin role
        const userCount = await databaseService.prisma.user.count();
        const isFirstUser = userCount === 0;

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = await databaseService.createUser({
            email,
            username,
            passwordHash: hashedPassword,
            role: isFirstUser ? 'admin' : (role || 'trader')
        });

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        
        res.status(201).json({
            message: 'User registered successfully',
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('[AUTH] Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            code: 'REGISTRATION_ERROR'
        });
    }
});

// POST /api/auth/login - Authenticate user and get JWT
router.post('/login', validateRequest(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;

        await databaseService.connect();

        // Find user
        const user = await databaseService.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Generate JWT token
        const secret = getSecret();
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            },
            secret,
            { expiresIn: '24h' } // Token expires in 24 hours
        );

        // Generate refresh token (longer expiry)
        const refreshToken = jwt.sign(
            { id: user.id, type: 'refresh' },
            secret,
            { expiresIn: '7d' }
        );

        console.log(`[AUTH] User logged in: ${email}`);

        // Return tokens and user info
        const { passwordHash: _, ...userWithoutPassword } = user;
        
        res.json({
            message: 'Login successful',
            token,
            refreshToken,
            user: userWithoutPassword,
            expiresIn: 86400 // 24 hours in seconds
        });

    } catch (error) {
        console.error('[AUTH] Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            code: 'LOGIN_ERROR'
        });
    }
});

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                error: 'Refresh token required',
                code: 'REFRESH_TOKEN_REQUIRED'
            });
        }

        const secret = getSecret();
        const decoded = jwt.verify(refreshToken, secret);

        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                error: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }

        // Find user
        await databaseService.connect();
        const user = await databaseService.getUserById(decoded.id);

        if (!user) {
            return res.status(401).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Generate new access token
        const newToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            },
            secret,
            { expiresIn: '24h' }
        );

        res.json({
            token: newToken,
            expiresIn: 86400
        });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Refresh token expired',
                code: 'REFRESH_TOKEN_EXPIRED'
            });
        }
        
        console.error('[AUTH] Token refresh error:', error);
        res.status(401).json({
            error: 'Invalid refresh token',
            code: 'INVALID_REFRESH_TOKEN'
        });
    }
});

// POST /api/auth/logout - Logout user
router.post('/logout', (req, res) => {
    // In production, implement token blacklist
    // For now, client should discard token
    res.json({
        message: 'Logout successful'
    });
});

// GET /api/auth/me - Get current user info
router.get('/me', authMiddleware, async (req, res) => {
    try {
        await databaseService.connect();
        const user = await databaseService.getUserByEmail(req.user.email);
    
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const { passwordHash: _, ...userWithoutPassword } = user;
        res.json({
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('[AUTH] Error fetching user:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});

module.exports = router;
