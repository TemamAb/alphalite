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
const metricsRoutes = require('./routes/metricsRoutes');


console.log('[APP] Routes loaded');

// --- Trading Routes (NO AUTH - Open Access) ---
// All trading routes are now public
const protectedMiddleware = [
    ...toMiddleware(apiLimiter),
    ...toMiddleware(tradingLimiter),
    tradingRoutes
];
app.use('/api', ...protectedMiddleware);

// --- Metrics Routes (NO AUTH - Open Access) ---
app.use('/api/metrics', metricsRoutes);

// --- Start Real-Time Metrics Service ---
if (realTimeMetrics && realTimeMetrics.start) {
    realTimeMetrics.start(wss);
}

// --- Start Backup Scheduler ---
if (process.env.NODE_ENV === 'production' && backupScheduler && backupScheduler.start) {
    backupScheduler.start();
}

// --- WebSocket Server (NO AUTH - Open Access) ---
wss.on('connection', (ws, req) => {
    // Open access - no authentication required
    console.log('[WSS] Client connected (open access)');
    
    ws.on('close', () => console.log('[WSS] Client disconnected'));
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
    app.get('*', (req, res, next) => {
        // If the request is for an API route, it should have been handled already.
        // If it reaches here, it's a 404. We send index.html only for non-API routes.
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
        }
        res.sendFile(path.join(clientDistPath, 'index.html'));
    });
}

// --- Process Level Error Handling (Production Safeguard) ---
process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught Exception:', error);
    // In production, we might want to stay alive if possible, but for fatal errors, 
    // it's often better to crash and let Docker/Render restart the service.
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

// --- Graceful Shutdown ---
const gracefulShutdown = async (signal) => {
    console.log(`[APP] ${signal} received. Starting graceful shutdown...`);
    server.close(() => {
        console.log('[APP] HTTP server closed.');
        // Disconnect from database if needed
        const { disconnect } = require('./utils/database');
        disconnect().then(() => {
            console.log('[APP] Database disconnected. Shutdown complete.');
            process.exit(0);
        });
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
        console.error('[APP] Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Only start server if run directly (allows testing via supertest)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[APP] 🚀 Server listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
}

module.exports = { app, server };

