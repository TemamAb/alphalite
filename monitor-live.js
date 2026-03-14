/**
 * AlphaPro Live Monitor (Dependency-Free)
 * Connects to localhost:3000 to display real-time engine stats.
 */
const http = require('http');

// Configuration
const API_URL = 'http://localhost:3000/api/engine/stats';
const REFRESH_RATE = 1000; // 1 second

// ANSI Colors for Terminal UI
const C = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgGreen: '\x1b[42m\x1b[30m', // Black text on Green bg
    bgRed: '\x1b[41m\x1b[37m',     // White text on Red bg
};

const fetchStats = () => {
    return new Promise((resolve, reject) => {
        const req = http.get(API_URL, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        parsed.isRunning = true;
                        resolve(parsed);
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    reject(new Error(`API returned status ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.setTimeout(2000, () => {
            req.destroy();
            reject(new Error('Connection Timeout'));
        });
    });
};

const renderUI = (data, error = null) => {
    // Clear console
    process.stdout.write('\x1b[2J\x1b[0f');

    console.log(`${C.cyan}╔══════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.cyan}║             ALPHAPRO REAL-TIME PROFIT MONITOR            ║${C.reset}`);
    console.log(`${C.cyan}╚══════════════════════════════════════════════════════════╝${C.reset}\n`);

    if (error) {
        console.log(` ${C.bgRed} CONNECTION ERROR ${C.reset} Unable to connect to Engine.`);
        console.log(` ${C.red}Details: ${error.message || 'Unknown Error'}${C.reset}`);
        console.log(` ${C.dim}Retrying in 1s...${C.reset}`);
        return;
    }

    const stats = data.stats || { totalTrades: 0, successfulTrades: 0, totalProfit: 0 };
    const mode = data.mode || 'UNKNOWN';
    const isRunning = data.isRunning;

    // Header Status
    const statusColor = isRunning ? C.green : C.red;
    const statusText = isRunning ? 'ONLINE' : 'OFFLINE';
    const modeBadge = mode === 'LIVE' ? `${C.bgGreen} LIVE ${C.reset}` : `${C.yellow} ${mode} ${C.reset}`;

    console.log(` Status: ${statusColor}● ${statusText}${C.reset}   Mode: ${modeBadge}   Port: ${C.bright}3000${C.reset}\n`);

    // Main Stats Grid
    console.log(`${C.bright} PERFORMANCE METRICS${C.reset}`);
    console.log(`${C.dim} ────────────────────────────────────────────────────────${C.reset}`);
    
    const profit = parseFloat(stats.totalProfit || 0).toFixed(6);
    const profitColor = profit > 0 ? C.green : (profit < 0 ? C.red : C.white);

    console.log(` 💰 Net Profit:       ${profitColor}${profit} ETH${C.reset}`);
    console.log(` ⚡ Total Trades:     ${C.cyan}${stats.totalTrades}${C.reset}`);
    console.log(` ✅ Successful:       ${C.green}${stats.successfulTrades}${C.reset}`);
    console.log(` ❌ Failed:           ${C.red}${stats.totalTrades - stats.successfulTrades}${C.reset}`);
    
    // Calculated Win Rate
    const winRate = stats.totalTrades > 0 
        ? ((stats.successfulTrades / stats.totalTrades) * 100).toFixed(1) 
        : '0.0';
    console.log(` 🎯 Win Rate:         ${C.yellow}${winRate}%${C.reset}`);

    console.log(`\n${C.dim} ────────────────────────────────────────────────────────${C.reset}`);
    console.log(` ${C.dim}Last Update: ${new Date().toLocaleTimeString()}${C.reset}`);
    console.log(` ${C.cyan}Monitoring active... Press Ctrl+C to exit.${C.reset}`);
};

const loop = async () => {
    try {
        const data = await fetchStats();
        renderUI(data);
    } catch (err) {
        renderUI(null, err);
    }
    setTimeout(loop, REFRESH_RATE);
};

// Start the monitor
console.log('Initializing monitor...');
loop();