// authRoutes.js - AlphaPro Authentication
// PRODUCTION: Implements JWT-based authentication

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const {
    generateToken,
    verifyPassword,
    ADMIN_CREDENTIALS,
    authMiddleware,
    requireAdmin
} = require('../middleware/authMiddleware');

// In a real application, this would interact with a database service (e.g., Prisma)
// For this fix, we use the hardcoded admin credentials as the single source of truth.
const findUserByEmail = async (email) => {
    if (email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()) {
        return ADMIN_CREDENTIALS;
    }
    return null;
};

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and return JWT
 * @access Public
 */
router.post('/login', async (req, res) => {
    console.log('[AUTH] Login attempt:', req.body.email);
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const isMatch = await verifyPassword(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            },
            expiresIn: 86400 // 24 hours in seconds
        });
    } catch (error) {
        console.error('[AUTH] Login error:', error);
        res.status(500).json({ error: 'Server error during authentication.' });
    }
});

/**
 * @route POST /api/auth/register
 * @desc Register a new user (disabled for non-admins in production)
 * @access Private (Admin only)
 */
router.post('/register', async (req, res) => {
    // In a production system, registration should be disabled or admin-only.
    return res.status(403).json({
        error: 'Public registration is disabled.',
        code: 'REGISTRATION_DISABLED'
    });
});

/**
 * @route POST /api/auth/logout
 * @desc Invalidate user session (client-side responsibility for JWT)
 * @access Public
 */
router.post('/logout', (req, res) => {
    // For JWT, logout is handled client-side by deleting the token.
    // This endpoint is for semantics.
    return res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

/**
 * @route GET /api/auth/me
 * @desc Get the current authenticated user's profile
 * @access Private
 */
router.get('/me', authMiddleware, (req, res) => {
    // authMiddleware places the user object on the request
    return res.json({
        success: true,
        user: req.user
    });
});

/**
 * @route POST /api/auth/change-password
 * @desc Change the user's password
 * @access Private
 */
router.post('/change-password', authMiddleware, requireAdmin, async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old password and new password are required.' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    // Verify the old password before proceeding. This is a critical security check.
    const isMatch = await verifyPassword(oldPassword, ADMIN_CREDENTIALS.passwordHash);
    if (!isMatch) {
        return res.status(401).json({ error: 'Invalid old password.' });
    }

    // In a full implementation:
    // 1. Find user by ID from the token (req.user.id)
    // 2. Verify oldPassword against the stored hash.
    // 3. If valid, hash the newPassword with bcrypt.
    // 4. Update the user's passwordHash in the database/store.
    // 5. For this hardcoded example, this would mean updating a file or an in-memory object,
    //    which is not secure or persistent. Therefore, this feature remains not implemented.

    return res.status(501).json({
        error: 'Password change is not implemented for the hardcoded admin user.',
        message: 'To change the password, you must generate a new password hash and update the `passwordHash` in `modules/api/middleware/authMiddleware.js`, then restart the server.'
    });
});

module.exports = router;
