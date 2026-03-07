// prometheusMetrics.js - Prometheus metrics for AlphaPro API
// Enterprise-grade observability

const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Request counter
const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

// Request duration histogram
const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register]
});

// Engine metrics
const engineTradesTotal = new promClient.Counter({
    name: 'engine_trades_total',
    help: 'Total number of trades executed',
    labelNames: ['status', 'chain', 'dex'],
    registers: [register]
});

const engineProfitTotal = new promClient.Gauge({
    name: 'engine_profit_total',
    help: 'Total profit in USD',
    registers: [register]
});

const engineActive = new promClient.Gauge({
    name: 'engine_active',
    help: 'Whether the engine is currently running',
    registers: [register]
});

// Wallet metrics
const walletBalanceTotal = new promClient.Gauge({
    name: 'wallet_balance_total',
    help: 'Total balance across all wallets in ETH',
    registers: [register]
});

const walletsCount = new promClient.Gauge({
    name: 'wallets_count',
    help: 'Number of connected wallets',
    registers: [register]
});

// Middleware to track requests
function metricsMiddleware(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;
        
        httpRequestsTotal.inc({
            method: req.method,
            route: route,
            status_code: res.statusCode
        });
        
        httpRequestDuration.observe({
            method: req.method,
            route: route,
            status_code: res.statusCode
        }, duration);
    });
    
    next();
}

// Metrics endpoint
function metricsEndpoint(req, res) {
    res.set('Content-Type', register.contentType);
    res.end(register.metrics());
}

// Update engine metrics
function updateEngineMetrics(status) {
    if (status) {
        engineActive.set(status.isRunning ? 1 : 0);
        if (status.stats) {
            engineProfitTotal.set(status.stats.totalProfit || 0);
        }
    }
}

// Update wallet metrics
function updateWalletMetrics(walletData) {
    if (walletData) {
        walletBalanceTotal.set(walletData.totalBalance || 0);
        walletsCount.set(walletData.count || 0);
    }
}

module.exports = {
    register,
    metricsMiddleware,
    metricsEndpoint,
    engineTradesTotal,
    engineProfitTotal,
    engineActive,
    walletBalanceTotal,
    walletsCount,
    updateEngineMetrics,
    updateWalletMetrics
};
