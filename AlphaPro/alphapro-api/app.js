const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const profitEngine = require('./src/engine/EnterpriseProfitEngine');
const preFlightCheckService = require('./PreFlightCheck');

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    
    // Send current stats immediately
    ws.send(JSON.stringify({
        type: 'STATS_UPDATE',
        data: profitEngine.getStatus()
    }));
    
    ws.on('close', () => {
        console.log('[WS] Client disconnected');
    });
});

// Broadcast stats to all WebSocket clients
function broadcastStats() {
    const stats = profitEngine.getStatus();
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'STATS_UPDATE',
                data: stats
            }));
        }
    });
}

// Broadcast stats every 5 seconds
setInterval(broadcastStats, 5000);

app.use(cors());
app.use(express.json());

// --- Security Middleware ---
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'alphapro-secret-key-dev';

const requireAdminAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === ADMIN_API_KEY) {
        return next(); // Authorized
    }
    console.warn('[SECURITY] Unauthorized attempt to access admin endpoint.');
    res.status(401).json({ error: 'Unauthorized' });
};


// --- API Routes ---

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

/**
 * Endpoint to run pre-flight checks.
 */
app.get('/api/preflight', async (req, res) => {
    const checkResult = await preFlightCheckService.runAllChecks();
    const httpStatus = checkResult.allOk ? 200 : 503; // 503 Service Unavailable
    res.status(httpStatus).json(checkResult);
});

/**
 * Endpoint to get the current state of the trading engine.
 */
app.get('/api/engine/state', (req, res) => {
    const mode = profitEngine.getMode();
    res.status(200).json({ mode });
});

/**
 * Endpoint to get profit stats from the trading engine.
 */
app.get('/api/engine/stats', (req, res) => {
    const status = profitEngine.getStatus();
    res.status(200).json(status);
});

/**
 * Endpoint to change the state of the trading engine.
 */
app.post('/api/engine/state', requireAdminAuth, (req, res) => {
    const { action } = req.body; // 'start' or 'pause'

    if (action === 'start') {
        profitEngine.setMode('LIVE');
    } else if (action === 'pause') {
        profitEngine.setMode('PAPER');
    } else {
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.status(200).json({ mode: profitEngine.getMode() });
});

/**
 * Endpoint to reload strategies dynamically.
 */
app.post('/api/engine/strategies/reload', requireAdminAuth, (req, res) => {
    profitEngine.reloadStrategies();
    const status = profitEngine.getStatus();
    res.status(200).json({ 
        message: 'Strategies reload triggered', 
        count: status.strategies.length 
    });
});

// --- Serve React Frontend (Production) ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client/dist/index.html'));
    });
}

server.listen(PORT, () => {
    console.log(`[ALPHA-PRO API] Server running on port ${PORT}`);
    console.log(`[WS] WebSocket available at ws://localhost:${PORT}/ws`);
});