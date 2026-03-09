const winston = require('winston');
const client = require('prom-client');
const { v4: uuidv4 } = require('uuid');

/**
 * Observability Service
 * Implements structured logging, Prometheus metrics, and distributed tracing support.
 * 
 * Features:
 * - JSON structured logging with correlation IDs
 * - Prometheus metrics registry and default metrics
 * - Custom business metrics (trades, profit, latency)
 * - Alert integration hooks
 */
class ObservabilityService {
    constructor() {
        // Initialize Prometheus Registry
        this.register = new client.Registry();
        
        // Add default metrics (CPU, memory, etc.)
        client.collectDefaultMetrics({ register: this.register, prefix: 'alphapro_' });

        // Initialize Logger
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'alphapro-engine' },
            transports: [
                new winston.transports.Console()
            ]
        });

        // Initialize Custom Metrics
        this.metrics = {
            httpRequestsTotal: new client.Counter({
                name: 'alphapro_http_requests_total',
                help: 'Total number of HTTP requests',
                labelNames: ['method', 'route', 'status'],
                registers: [this.register]
            }),
            tradesTotal: new client.Counter({
                name: 'alphapro_trades_total',
                help: 'Total number of executed trades',
                labelNames: ['strategy', 'chain', 'status'],
                registers: [this.register]
            }),
            profitTotal: new client.Gauge({
                name: 'alphapro_profit_total_eth',
                help: 'Total profit generated in ETH',
                registers: [this.register]
            }),
            operationDuration: new client.Histogram({
                name: 'alphapro_operation_duration_seconds',
                help: 'Duration of critical operations in seconds',
                labelNames: ['operation'],
                buckets: [0.1, 0.5, 1, 2, 5, 10],
                registers: [this.register]
            }),
            errorsTotal: new client.Counter({
                name: 'alphapro_errors_total',
                help: 'Total number of errors logged',
                labelNames: ['type', 'severity'],
                registers: [this.register]
            })
        };
    }

    /**
     * Get a child logger with a correlation ID
     * @param {string} correlationId - Optional existing ID
     * @returns {object} Winston logger instance
     */
    getLogger(correlationId) {
        const id = correlationId || uuidv4();
        return this.logger.child({ correlationId: id });
    }

    /**
     * Log an info message
     * @param {string} message 
     * @param {object} meta 
     */
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    /**
     * Log an error message and increment error metric
     * @param {string} message 
     * @param {Error|object} error 
     * @param {object} meta 
     */
    error(message, error, meta = {}) {
        this.logger.error(message, { ...meta, error });
        this.metrics.errorsTotal.inc({ 
            type: error.name || 'UnknownError', 
            severity: 'error' 
        });
    }

    /**
     * Record an HTTP request
     * @param {string} method 
     * @param {string} route 
     * @param {number} status 
     */
    recordRequest(method, route, status) {
        this.metrics.httpRequestsTotal.inc({ method, route, status });
    }

    /**
     * Record a trade execution
     * @param {string} strategy 
     * @param {string} chain 
     * @param {string} status - 'success' or 'failed'
     * @param {number} profitEth - Profit in ETH (only if success)
     */
    recordTrade(strategy, chain, status, profitEth = 0) {
        this.metrics.tradesTotal.inc({ strategy, chain, status });
        if (status === 'success' && profitEth > 0) {
            this.metrics.profitTotal.inc(profitEth);
        }
    }

    /**
     * Start a timer for an operation
     * @param {string} operationName 
     * @returns {Function} Call this function to stop the timer
     */
    startTimer(operationName) {
        return this.metrics.operationDuration.startTimer({ operation: operationName });
    }

    /**
     * Get metrics for Prometheus scraping
     * @returns {Promise<string>} Metrics in Prometheus format
     */
    async getMetrics() {
        return await this.register.metrics();
    }

    /**
     * Send an alert to configured channels (Slack, PagerDuty, etc.)
     * @param {string} title 
     * @param {string} message 
     * @param {string} severity - 'info', 'warning', 'critical'
     */
    async sendAlert(title, message, severity = 'info') {
        this.logger.warn(`[ALERT] ${title}: ${message}`, { severity });
        
        // Webhook integration (e.g., Slack)
        if (process.env.SLACK_WEBHOOK_URL) {
            try {
                // Simple fetch implementation to avoid circular dependencies
                // In production, use a robust HTTP client
                const payload = {
                    text: `*${title}*\n${message}`,
                    color: severity === 'critical' ? '#ff0000' : severity === 'warning' ? '#ffcc00' : '#36a64f'
                };
                
                // Note: Actual fetch call would go here
                // await fetch(process.env.SLACK_WEBHOOK_URL, { method: 'POST', body: JSON.stringify(payload) });
            } catch (err) {
                this.logger.error('Failed to send alert webhook', { error: err });
            }
        }
    }
}

// Export singleton instance
module.exports = new ObservabilityService();