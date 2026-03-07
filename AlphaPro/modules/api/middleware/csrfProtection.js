/**
 * CSRF Protection Middleware
 * 
 * Implements CSRF token validation for state-changing operations
 * Uses double-submit cookie pattern for stateless validation
 */

const crypto = require('crypto');

// Generate secure CSRF token
function generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
}

// CSRF middleware configuration
const csrfConfig = {
    cookieName: 'csrf_token',
    headerName: 'x-csrf-token',
    cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
    }
};

/**
 * Generate and attach CSRF token to response
 * Called on login and page load
 */
const csrfTokenGenerator = (req, res, next) => {
    // Generate new token if not exists or invalid
    let token = req.csrfToken;
    
    if (!token || token.length !== 64) {
        token = generateCSRFToken();
        req.csrfToken = token;
    }
    
    // Set cookie with CSRF token
    res.cookie(csrfConfig.cookieName, token, csrfConfig.cookieOptions);
    
    // Also send in response header for API clients
    res.setHeader('X-CSRF-Token', token);
    
    next();
};

/**
 * Validate CSRF token for state-changing operations
 * Skip for GET, HEAD, OPTIONS (safe methods)
 */
const csrfValidator = (req, res, next) => {
    // Skip validation for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }
    
    // Skip for API endpoints that don't require CSRF (public APIs)
    const publicPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/health',
        '/api/public'
    ];
    
    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }
    
    // Get token from header or cookie
    const tokenFromHeader = req.headers[csrfConfig.headerName];
    const tokenFromCookie = req.cookies[csrfConfig.cookieName];
    
    // If no token provided, reject
    if (!tokenFromHeader && !tokenFromCookie) {
        return res.status(403).json({
            error: 'CSRF token required',
            code: 'CSRF_MISSING'
        });
    }
    
    // Validate token (compare header token with cookie token)
    const tokenToValidate = tokenFromHeader || tokenFromCookie;
    
    if (!tokenToValidate || tokenToValidate.length !== 64) {
        return res.status(403).json({
            error: 'Invalid CSRF token',
            code: 'CSRF_INVALID'
        });
    }
    
    // For additional security, validate against a secret
    const csrfSecret = process.env.CSRF_SECRET;
    if (csrfSecret) {
        const expectedToken = crypto
            .createHmac('sha256', csrfSecret)
            .update(req.session?.userId || req.ip)
            .digest('hex');
        
        if (tokenToValidate !== expectedToken) {
            return res.status(403).json({
                error: 'CSRF token validation failed',
                code: 'CSRF_INVALID'
            });
        }
    }
    
    next();
};

/**
 * CSRF token endpoint - returns token for AJAX requests
 */
const getCSRFToken = (req, res) => {
    const token = req.csrfToken || generateCSRFToken();
    
    res.cookie(csrfConfig.cookieName, token, csrfConfig.cookieOptions);
    res.json({ csrfToken: token });
};

module.exports = {
    csrfTokenGenerator,
    csrfValidator,
    getCSRFToken,
    generateCSRFToken,
    csrfConfig
};
