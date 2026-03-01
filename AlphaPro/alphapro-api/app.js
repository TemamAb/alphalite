const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const profitEngine = require('./src/engine/EnterpriseProfitEngine');
const preFlightCheckService = require('./PreFlightCheck');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory wallet storage (in production, use PostgreSQL)
let wallets = [];

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

// --- Wallet Management API ---

/**
 * Get all wallets
 */
app.get('/api/wallets', (req, res) => {
    const walletStats = wallets.map(w => ({
        address: w.address,
        totalProfit: w.totalProfit || 0,
        tradesCount: w.tradesCount || 0,
        balances: w.balances || { ETH: '0.00', ARB: '0.00', OP: '0.00', BASE: '0.00', MATIC: '0.00' }
    }));
    const totalBalance = walletStats.reduce((sum, w) => sum + w.totalProfit, 0);
    res.json({ wallets: walletStats, totalBalance: totalBalance.toFixed(4), count: walletStats.length });
});

/**
 * Add wallets (bulk import)
 */
app.post('/api/wallets/import', (req, res) => {
    const { addresses } = req.body;
    if (!addresses || !Array.isArray(addresses)) {
        return res.status(400).json({ error: 'Invalid addresses array' });
    }
    const newWallets = addresses.map(addr => ({
        address: addr,
        totalProfit: Math.random() * 5, // Simulated profit for demo
        tradesCount: Math.floor(Math.random() * 50),
        balances: { 
            ETH: (Math.random() * 2).toFixed(4), 
            ARB: (Math.random() * 5).toFixed(4), 
            OP: (Math.random() * 3).toFixed(4), 
            BASE: (Math.random() * 4).toFixed(4), 
            MATIC: (Math.random() * 1000).toFixed(0)
        }
    }));
    wallets = [...wallets, ...newWallets];
    res.json({ success: true, count: newWallets.length });
});

/**
 * Get total profit from all wallets
 */
app.get('/api/wallets/total-profit', (req, res) => {
    const totalProfit = wallets.reduce((sum, w) => sum + (w.totalProfit || 0), 0);
    res.json({ totalProfit: totalProfit.toFixed(4), currency: 'ETH' });
});

/**
 * Withdraw profits
 */
app.post('/api/wallets/withdraw', (req, res) => {
    const { mode, amount } = req.body; 
    
    if (mode === 'auto') {
        res.json({ success: true, mode: 'auto', message: 'Auto-withdraw enabled' });
    } else {
        const totalProfit = wallets.reduce((sum, w) => sum + (w.totalProfit || 0), 0);
        res.json({ success: true, mode: 'manual', amount: amount || totalProfit.toFixed(4), message: 'Withdrawal initiated' });
    }
});

// Trading settings
let tradingSettings = {
    reinvestmentRate: 50, // 0-100%
    capitalVelocity: 100 // $1M-$500M in millions
};

/**
 * Get trading settings
 */
app.get('/api/settings/trading', (req, res) => {
    res.json(tradingSettings);
});

/**
 * Update trading settings
 */
app.post('/api/settings/trading', (req, res) => {
    const { reinvestmentRate, capitalVelocity } = req.body;
    
    if (reinvestmentRate !== undefined) {
        tradingSettings.reinvestmentRate = Math.max(0, Math.min(100, reinvestmentRate));
    }
    if (capitalVelocity !== undefined) {
        tradingSettings.capitalVelocity = Math.max(1, Math.min(500, capitalVelocity));
    }
    
    res.json({ success: true, settings: tradingSettings });
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