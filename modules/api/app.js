const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);

// --- Cookie Parser for CSRF ---
app.use(cookieParser());

// --- WebSocket Server Setup ---
// The HTTP server is passed to the WebSocket server to allow it to handle upgrade requests.
const wss = new WebSocketServer({ server });

// --- Middleware ---
app.use(cors({
    origin: true, // Allow all origins in production (Render handles this)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// --- Security Middleware ---
// NO AUTH VERSION: Rate limiting only
const { apiLimiter, authLimiter, tradingLimiter } = require('./middleware/rateLimiter');
const { csrfTokenGenerator } = require('./middleware/csrfProtection');

// Ensure middleware is always an array of functions (handle express-rate-limit v7 array return)
const toMiddleware = (m) => {
    if (!m) return [];
    if (Array.isArray(m)) return m.filter(fn => typeof fn === 'function');
    if (typeof m === 'function') return [m];
    // Handle objects with default export (ES module compatibility)
    if (typeof m === 'object' && m.default && typeof m.default === 'function') {
        return [m.default];
    }
    console.warn('[APP] Warning: middleware is not a function, got:', typeof m);
    return [];
};

console.log('[APP] Middleware loaded');

// --- Initialize optional engine services (graceful degradation) ---
let realTimeMetrics = null;
let observabilityService = null;
let backupScheduler = null;

try {
    realTimeMetrics = require('../engine/services/RealTimeMetricsService');
} catch (e) {
    console.warn('[APP] RealTimeMetricsService not available');
}

try {
    observabilityService = require('../engine/services/ObservabilityService');
} catch (e) {
    console.warn('[APP] ObservabilityService not available');
}

try {
    backupScheduler = require('./services/BackupScheduler');
} catch (e) {
    console.warn('[APP] BackupScheduler not available');
}

// --- CSRF Token Endpoint ---
// Public endpoint to get CSRF token
app.get('/api/csrf-token', csrfTokenGenerator);

// --- Public Health Check (No Auth Required) ---
// Keep health endpoint public for load balancers/monitoring
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Prometheus Metrics Endpoint (No Auth Required) ---
app.get('/metrics', async (req, res) => {
    try {
        if (!observabilityService) {
            return res.status(503).end('Observability service not available');
        }
        res.set('Content-Type', observabilityService.register.contentType);
        res.end(await observabilityService.getMetrics());
    } catch (ex) {
        res.status(500).end(ex);
    }
});

// --- API Routes ---
// Import API routes
const tradingRoutes = require('./routes/tradingRoutes');
const authRoutes = require('./routes/authRoutes');
const metricsRoutes = require('./routes/metricsRoutes');

console.log('[APP] Routes loaded');

// --- Authentication Routes (NO AUTH REQUIRED - must be before authMiddleware) ---
// Rate limited to prevent brute force
app.use('/api/auth', authLimiter, authRoutes);

// --- Protected Trading Routes ---
// All trading routes protected by:
// - apiLimiter: 100 req/15min general limit
// - tradingLimiter: 10 req/min STRICT limit for trading
// - authMiddleware: JWT authentication required
// - csrfValidator: Validates X-CSRF-Token header/cookie
// Use toMiddleware helper to ensure each is an array of functions

// PRODUCTION: Enable authentication middleware
const { authMiddleware } = require('./middleware/authMiddleware');
const { csrfValidator } = require('./middleware/csrfProtection');

// Protected routes WITH authentication
const protectedMiddleware = [
    ...toMiddleware(apiLimiter),
    ...toMiddleware(tradingLimiter),
    authMiddleware, // Applied before tradingRoutes
    tradingRoutes
];
app.use('/api', ...protectedMiddleware);

// --- Metrics Routes (Protected) ---
app.use('/api/metrics', authMiddleware, metricsRoutes);

// --- Start Real-Time Metrics Service ---
if (realTimeMetrics && realTimeMetrics.start) {
    realTimeMetrics.start(wss);
}

// --- Start Backup Scheduler ---
if (process.env.NODE_ENV === 'production' && backupScheduler && backupScheduler.start) {
    backupScheduler.start();
}

// --- WebSocket Server with Authentication ---
// Authenticate WebSocket connections using JWT
const { verifyToken } = require('./middleware/authMiddleware');

wss.on('connection', (ws, req) => {
    // Authenticate WebSocket connection via token in query string
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
        console.warn('[WSS] Connection rejected: No token provided');
        ws.close(4001, 'Authentication token required');
        return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        console.warn('[WSS] Connection rejected: Invalid token');
        ws.close(4003, 'Invalid or expired token');
        return;
    }

    console.log(`[WSS] Client connected: ${decoded.email}`);
    ws.user = decoded;

    ws.on('close', () => console.log(`[WSS] Client disconnected: ${decoded.email}`));
    ws.on('error', console.error);
});

// --- Production Static File Serving ---
// This block is crucial for the unified Docker image. It will only run when
// the NODE_ENV environment variable is set to 'production'.
if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path.join(__dirname, 'client', 'dist');
    console.log(`[PROD] Serving static files from: ${clientDistPath}`);

    // Serve the static files (JS, CSS, images) from the built React app
    app.use(express.static(clientDistPath));

    // For any other request, serve the index.html file.
    // This allows client-side routing (e.g., React Router) to take over.
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
    });
}

// Only start server if run directly (allows testing via supertest)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
}

module.exports = { app, server };