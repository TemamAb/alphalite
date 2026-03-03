const express = require('express');
const cors = require('cors');
const path = require('path');
const profitEngine = require('./src/engine/EnterpriseProfitEngine');
const preFlightCheckService = require('./PreFlightCheck'); // FIX: Located at root in Docker
const configService = require('./config/configService');   // FIX: Located at root/config in Docker


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
 * Endpoint to change the state of the trading engine.
 */
app.post('/api/engine/state', (req, res) => {
    const { action, mode } = req.body; // 'start' or 'pause', and 'PAPER' or 'LIVE'

    if (action === 'start') {
        // Respect the mode sent from the client, default to PAPER for safety.
        profitEngine.setMode(mode === 'LIVE' ? 'LIVE' : 'PAPER');
    } else if (action === 'pause') {
        profitEngine.setMode('PAPER');
    } else {
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.status(200).json({ mode: profitEngine.getMode() });
});

/**
 * Endpoint to reload the strategies.json file dynamically.
 */
app.post('/api/strategies/reload', (req, res) => {
    profitEngine.reloadStrategies();
    res.status(200).json({ message: 'Strategies reloaded successfully.' });
});

// --- Serve React Frontend (Production) ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/dist'))); // FIX: Docker path is /app/client/dist
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client/dist/index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`[ALPHA-PRO DASHBOARD] Server running on port ${PORT}`);
});