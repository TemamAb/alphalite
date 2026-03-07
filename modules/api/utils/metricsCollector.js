/**
 * Real Metrics Collector
 * Collects actual system metrics for observability
 * Integrates with Prometheus for scraping
 */

const os = require('os');
const EventEmitter = require('events');

class MetricsCollector extends EventEmitter {
    constructor() {
        super();
        
        // Initialize metrics storage
        this.metrics = {
            api: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                totalResponseTime: 0,
                activeConnections: 0
            },
            trading: {
                totalTrades: 0,
                successfulTrades: 0,
                failedTrades: 0,
                totalVolume: 0,
                totalProfit: 0
            },
            system: {
                cpuUsage: 0,
                memoryUsage: 0,
                uptime: process.uptime()
            },
            latency: {
                cacheLookup: [],
                apiHotPath: [],
                blockDetection: [],
                executionPath: []
            }
        };
        
        // Start periodic collection
        this.startPeriodicCollection();
    }
    
    /**
     * Record an API request
     */
    recordRequest(responseTime, success = true) {
        this.metrics.api.totalRequests++;
        this.metrics.api.totalResponseTime += responseTime;
        
        if (success) {
            this.metrics.api.successfulRequests++;
        } else {
            this.metrics.api.failedRequests++;
        }
        
        // Track latency
        this.metrics.latency.apiHotPath.push(responseTime);
        if (this.metrics.latency.apiHotPath.length > 100) {
            this.metrics.latency.apiHotPath.shift();
        }
    }
    
    /**
     * Record a trade execution
     */
    recordTrade(success, volume = 0, profit = 0) {
        this.metrics.trading.totalTrades++;
        
        if (success) {
            this.metrics.trading.successfulTrades++;
            this.metrics.trading.totalProfit += profit;
        } else {
            this.metrics.trading.failedTrades++;
        }
        
        this.metrics.trading.totalVolume += volume;
    }
    
    /**
     * Record latency metrics
     */
    recordLatency(type, value) {
        if (this.metrics.latency[type]) {
            this.metrics.latency[type].push(value);
            if (this.metrics.latency[type].length > 100) {
                this.metrics.latency[type].shift();
            }
        }
    }
    
    /**
     * Update system metrics
     */
    updateSystemMetrics() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        
        cpus.forEach(cpu => {
            for (let type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        
        this.metrics.system.cpuUsage = 100 - (100 * totalIdle / totalTick);
        this.metrics.system.memoryUsage = 1 - (os.freemem() / os.totalmem());
        this.metrics.system.uptime = process.uptime();
    }
    
    /**
     * Get average latency for a type
     */
    getAverageLatency(type) {
        const values = this.metrics.latency[type];
        if (!values || values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    
    /**
     * Get all metrics for API response
     */
    getMetrics() {
        this.updateSystemMetrics();
        
        const avgResponseTime = this.metrics.api.totalRequests > 0 
            ? this.metrics.api.totalResponseTime / this.metrics.api.totalRequests 
            : 0;
            
        const successRate = this.metrics.api.totalRequests > 0
            ? (this.metrics.api.successfulRequests / this.metrics.api.totalRequests) * 100
            : 0;
            
        return {
            api: {
                totalRequests: this.metrics.api.totalRequests,
                successRate: successRate.toFixed(2),
                avgResponseTime: avgResponseTime.toFixed(2),
                activeConnections: this.metrics.api.activeConnections,
                timestamp: Date.now()
            },
            trading: {
                totalTrades: this.metrics.trading.totalTrades,
                successfulTrades: this.metrics.trading.successfulTrades,
                failedTrades: this.metrics.trading.failedTrades,
                totalVolume: this.metrics.trading.totalVolume,
                totalProfit: this.metrics.trading.totalProfit,
                winRate: this.metrics.trading.totalTrades > 0
                    ? (this.metrics.trading.successfulTrades / this.metrics.trading.totalTrades * 100).toFixed(2)
                    : 0
            },
            latency: {
                cacheLookup: this.getAverageLatency('cacheLookup').toFixed(2),
                apiHotPath: this.getAverageLatency('apiHotPath').toFixed(2),
                blockDetection: this.getAverageLatency('blockDetection').toFixed(2),
                executionPath: this.getAverageLatency('executionPath').toFixed(2),
                lastUpdate: new Date().toISOString()
            },
            system: {
                cpuUsage: this.metrics.system.cpuUsage.toFixed(2),
                memoryUsage: (this.metrics.system.memoryUsage * 100).toFixed(2),
                uptime: this.metrics.system.uptime
            }
        };
    }
    
    /**
     * Start periodic system metrics collection
     */
    startPeriodicCollection() {
        setInterval(() => {
            this.updateSystemMetrics();
        }, 5000);
    }
}

// Export singleton instance
const metricsCollector = new MetricsCollector();

module.exports = metricsCollector;
