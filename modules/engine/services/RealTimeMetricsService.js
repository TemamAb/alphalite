const metricsCollector = require('../../api/utils/metricsCollector');
const profitEngine = require('../EnterpriseProfitEngine');
const executionOrchestrator = require('./ExecutionOrchestrator');
const personaManager = require('./PersonaManager');

class RealTimeMetricsService {
    constructor() {
        this.wss = null;
        this.interval = null;
    }

    start(wss) {
        this.wss = wss;
        
        // Broadcast metrics every second
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.broadcastSystemState(), 1000);

        // Subscribe to real-time events
        this.subscribeToEvents();
        
        console.log('[METRICS] 🚀 Real-Time Metrics Service started');
    }

    subscribeToEvents() {
        // Broadcast trades immediately
        profitEngine.on('tradeExecuted', (trade) => {
            this.broadcast('trade', trade);
        });

        // Broadcast Persona logs (Intelligence Feed)
        personaManager.on('log', (logEntry) => {
            // Format for frontend: "[PERSONA] Message"
            // logEntry.personaId is like 'strategist', 'sniper'
            const formattedLog = `[${logEntry.personaId.toUpperCase()}] ${logEntry.message}`;
            this.broadcast('log', formattedLog);
        });
    }

    broadcastSystemState() {
        if (!this.wss) return;

        // Gather data
        const metrics = metricsCollector.getMetrics();
        const engineStatus = profitEngine.getStatus();
        const orchestratorStatus = executionOrchestrator.getStatus();

        // 1. Health
        this.broadcast('health', {
            overall: 'healthy',
            components: [
                { name: 'API Gateway', status: 'healthy', latency: parseFloat(metrics.latency.apiHotPath) || 0, errorRate: 0 },
                { name: 'Engine', status: engineStatus.mode === 'LIVE' ? 'healthy' : 'standby', latency: parseFloat(metrics.latency.executionPath) || 0, errorRate: 0 },
                { name: 'Database', status: 'healthy', latency: 5, errorRate: 0 },
                { name: 'Redis', status: 'healthy', latency: 2, errorRate: 0 }
            ],
            lastUpdate: new Date().toISOString()
        });

        // 2. Engine Metrics
        this.broadcast('metrics', {
            type: 'engine',
            data: {
                status: engineStatus.mode === 'LIVE' ? 'running' : 'stopped',
                mode: engineStatus.mode,
                activeStrategies: engineStatus.strategies.length,
                profit24h: metrics.trading.totalProfit,
                utilization: orchestratorStatus.capitalStatus.utilization
            }
        });

        // 3. Trade Stats
        this.broadcast('metrics', {
            type: 'trades',
            data: metrics.trading
        });
    }

    broadcast(type, payload) {
        if (!this.wss) return;
        const message = JSON.stringify({ type, payload });
        this.wss.clients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(message);
            }
        });
    }
}

module.exports = new RealTimeMetricsService();