/**
 * AlphaPro Observability Service
 * 
 * Provides enterprise-grade observability:
 * - Structured JSON logging with correlation IDs
 * - Distributed tracing (OpenTelemetry compatible)
 * - Prometheus metrics export
 * - Alert integration hooks
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class ObservabilityService extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            // Logging configuration
            logLevel: config.logLevel || 'info',
            logToFile: config.logToFile || true,
            logDirectory: config.logDirectory || './logs',
            logFormat: config.logFormat || 'json', // 'json' or 'text'
            
            // Metrics configuration
            metricsEnabled: config.metricsEnabled || true,
            metricsPort: config.metricsPort || 9090,
            metricsPath: config.metricsPath || '/metrics',
            
            // Tracing configuration
            tracingEnabled: config.tracingEnabled || true,
            tracingSampleRate: config.tracingSampleRate || 0.1,
            
            // Alerting
            alertingEnabled: config.alertingEnabled || false,
            
            // Service info
            serviceName: config.serviceName || 'alphapro',
            serviceVersion: config.serviceVersion || '1.0.0',
            environment: config.environment || 'development'
        };

        // Initialize components
        this.logger = this._initLogger();
        this.metrics = this._initMetrics();
        this.tracer = this._initTracer();
        
        // Correlation ID management
        this.correlationId = null;
        
        // Ensure log directory exists
        if (this.config.logToFile) {
            this._ensureLogDirectory();
        }
        
        console.log(`[OBSERVABILITY] Initialized: ${this.config.serviceName} v${this.config.serviceVersion}`);
    }

    /**
     * Initialize structured logger
     */
    _initLogger() {
        const levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
            critical: 4
        };
        
        return {
            level: levels[this.config.logLevel] || 1,
            log: (level, message, meta = {}) => {
                if (levels[level] < this.level) return;
                
                const logEntry = {
                    timestamp: new Date().toISOString(),
                    level: level.toUpperCase(),
                    service: this.config.serviceName,
                    version: this.config.serviceVersion,
                    environment: this.config.environment,
                    message,
                    correlationId: this.correlationId || this._generateCorrelationId(),
                    ...meta
                };
                
                // Console output
                const formatted = this.config.logFormat === 'json'
                    ? JSON.stringify(logEntry)
                    : this._formatTextLog(logEntry);
                
                console.log(formatted);
                
                // File output
                if (this.config.logToFile) {
                    this._writeToFile(logEntry);
                }
                
                // Emit events for alerting
                if (level === 'error' || level === 'critical') {
                    this.emit('error', logEntry);
                }
                
                if (level === 'warn') {
                    this.emit('warning', logEntry);
                }
            },
            
            debug: (msg, meta) => this.log('debug', msg, meta),
            info: (msg, meta) => this.log('info', msg, meta),
            warn: (msg, meta) => this.log('warn', msg, meta),
            error: (msg, meta) => this.log('error', msg, meta),
            critical: (msg, meta) => this.log('critical', msg, meta),
            
            // Child logger with additional context
            child: (context) => {
                return {
                    debug: (msg, meta) => this.log('debug', msg, { ...context, ...meta }),
                    info: (msg, meta) => this.log('info', msg, { ...context, ...meta }),
                    warn: (msg, meta) => this.log('warn', msg, { ...context, ...meta }),
                    error: (msg, meta) => this.log('error', msg, { ...context, ...meta }),
                    critical: (msg, meta) => this.log('critical', msg, { ...context, ...meta }),
                };
            }
        };
    }

    /**
     * Format log as text
     */
    _formatTextLog(entry) {
        const { timestamp, level, message, correlationId, ...meta } = entry;
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level.padEnd(8)} [${correlationId}] ${message}${metaStr}`;
    }

    /**
     * Generate correlation ID
     */
    _generateCorrelationId() {
        return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * Set correlation ID for current request/operation
     */
    setCorrelationId(id) {
        this.correlationId = id;
    }

    /**
     * Create new correlation ID
     */
    createCorrelationId() {
        this.correlationId = this._generateCorrelationId();
        return this.correlationId;
    }

    /**
     * Ensure log directory exists
     */
    _ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.config.logDirectory)) {
                fs.mkdirSync(this.config.logDirectory, { recursive: true });
            }
        } catch (error) {
            console.error('[OBSERVABILITY] Failed to create log directory:', error.message);
        }
    }

    /**
     * Write log to file
     */
    _writeToFile(entry) {
        const date = new Date().toISOString().split('T')[0];
        const filename = path.join(this.config.logDirectory, `${this.config.serviceName}-${date}.log`);
        const line = JSON.stringify(entry) + '\n';
        
        fs.appendFile(filename, line, (err) => {
            if (err) {
                console.error('[OBSERVABILITY] Failed to write log:', err.message);
            }
        });
    }

    /**
     * ============ METRICS ============
     */
    _initMetrics() {
        // Prometheus-style metrics storage
        const counters = new Map();
        const gauges = new Map();
        const histograms = new Map();
        
        return {
            // Counter: monotonically increasing value
            counter: (name, labels = {}) => {
                const key = `${name}:${JSON.stringify(labels)}`;
                if (!counters.has(key)) {
                    counters.set(key, { name, labels, value: 0 });
                }
                return {
                    inc: (delta = 1) => {
                        counters.get(key).value += delta;
                    },
                    getValue: () => counters.get(key).value
                };
            },
            
            // Gauge: point-in-time value
            gauge: (name, labels = {}) => {
                const key = `${name}:${JSON.stringify(labels)}`;
                if (!gauges.has(key)) {
                    gauges.set(key, { name, labels, value: 0 });
                }
                return {
                    set: (value) => {
                        gauges.get(key).value = value;
                    },
                    inc: (delta = 1) => {
                        gauges.get(key).value += delta;
                    },
                    dec: (delta = 1) => {
                        gauges.get(key).value -= delta;
                    },
                    getValue: () => gauges.get(key).value
                };
            },
            
            // Histogram: distribution of values
            histogram: (name, labels = {}, buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]) => {
                const key = `${name}:${JSON.stringify(labels)}`;
                if (!histograms.has(key)) {
                    histograms.set(key, {
                        name,
                        labels,
                        buckets: buckets.reduce((acc, b) => ({ ...acc, [b]: 0 }), {}),
                        values: [],
                        sum: 0,
                        count: 0
                    });
                }
                return {
                    observe: (value) => {
                        const hist = histograms.get(key);
                        hist.values.push(value);
                        hist.sum += value;
                        hist.count++;
                        for (const bucket of Object.keys(hist.buckets)) {
                            if (value <= parseFloat(bucket)) {
                                hist.buckets[bucket]++;
                            }
                        }
                    },
                    getMetrics: () => {
                        const hist = histograms.get(key);
                        return {
                            sum: hist.sum,
                            count: hist.count,
                            buckets: hist.buckets,
                            mean: hist.count > 0 ? hist.sum / hist.count : 0
                        };
                    }
                };
            },
            
            // Export all metrics in Prometheus format
            export: () => {
                let output = '';
                
                // Export counters
                for (const [, metric] of counters) {
                    const labelStr = Object.entries(metric.labels)
                        .map(([k, v]) => `${k}="${v}"`)
                        .join(',');
                    output += `# TYPE ${metric.name} counter\n`;
                    output += `${metric.name}{${labelStr}} ${metric.value}\n`;
                }
                
                // Export gauges
                for (const [, metric] of gauges) {
                    const labelStr = Object.entries(metric.labels)
                        .map(([k, v]) => `${k}="${v}"`)
                        .join(',');
                    output += `# TYPE ${metric.name} gauge\n`;
                    output += `${metric.name}{${labelStr}} ${metric.value}\n`;
                }
                
                // Export histograms
                for (const [, metric] of histograms) {
                    const labelStr = Object.entries(metric.labels)
                        .map(([k, v]) => `${k}="${v}"`)
                        .join(',');
                    
                    output += `# TYPE ${metric.name} histogram\n`;
                    
                    const m = metric.getMetrics ? metric : { buckets: metric.buckets, count: metric.count, sum: metric.sum };
                    
                    for (const [bucket, count] of Object.entries(m.buckets)) {
                        output += `${metric.name}_bucket{${labelStr},le="${bucket}"} ${count}\n`;
                    }
                    output += `${metric.name}_sum{${labelStr}} ${m.sum}\n`;
                    output += `${metric.name}_count{${labelStr}} ${m.count}\n`;
                }
                
                return output;
            },
            
            // Get raw metrics
            getAll: () => ({
                counters: Array.from(counters.values()),
                gauges: Array.from(gauges.values()),
                histograms: Array.from(histograms.values()).map(h => ({
                    name: h.name,
                    labels: h.labels,
                    ...h.getMetrics()
                }))
            }),
            
            // Predefined metrics for common use cases
            predefined: {
                // HTTP metrics
                httpRequests: (method, route, status) => {
                    const labels = { method, route, status: status.toString() };
                    return {
                        counter: this.metrics.counter('http_requests_total', labels),
                        duration: this.metrics.histogram('http_request_duration_seconds', labels)
                    };
                },
                
                // Business metrics
                trades: (type, status) => {
                    return this.metrics.counter('trades_total', { type, status });
                },
                
                profits: () => {
                    return this.metrics.gauge('profit_total_eth');
                },
                
                latency: (operation) => {
                    return this.metrics.histogram(`operation_duration_seconds`, { operation });
                },
                
                errors: (type) => {
                    return this.metrics.counter('errors_total', { type });
                }
            }
        };
    }

    /**
     * ============ TRACING ============
     */
    _initTracer() {
        const spans = new Map();
        let traceIdCounter = 0;
        
        return {
            // Start a new trace
            startSpan: (name, options = {}) => {
                const shouldSample = Math.random() < this.config.tracingSampleRate;
                
                if (!shouldSample && this.config.tracingSampleRate < 1) {
                    return {
                        end: () => {},
                        setAttribute: () => {},
                        addEvent: () => {},
                        addError: () => {}
                    };
                }
                
                const traceId = options.traceId || `trace_${++traceIdCounter}_${Date.now()}`;
                const spanId = `span_${Math.random().toString(36).substring(2, 11)}`;
                const startTime = Date.now();
                
                const span = {
                    traceId,
                    spanId,
                    name,
                    startTime,
                    endTime: null,
                    attributes: { ...options.attributes },
                    events: [],
                    status: { code: 'ok' },
                    parentSpanId: options.parentSpanId
                };
                
                spans.set(spanId, span);
                
                this.logger.debug(`[TRACE] Started span: ${name}`, { traceId, spanId });
                
                return {
                    end: (attributes = {}) => {
                        span.endTime = Date.now();
                        span.duration = span.endTime - span.startTime;
                        Object.assign(span.attributes, attributes);
                        
                        this.logger.info(`[TRACE] Ended span: ${name}`, {
                            traceId,
                            spanId,
                            duration: span.duration,
                            status: span.status.code
                        });
                        
                        spans.delete(spanId);
                    },
                    
                    setAttribute: (key, value) => {
                        span.attributes[key] = value;
                    },
                    
                    addEvent: (name, attributes = {}) => {
                        span.events.push({
                            name,
                            timestamp: Date.now(),
                            attributes
                        });
                    },
                    
                    addError: (error) => {
                        span.status = { code: 'error', message: error.message };
                        span.events.push({
                            name: 'exception',
                            timestamp: Date.now(),
                            attributes: {
                                'error.message': error.message,
                                'error.stack': error.stack
                            }
                        });
                        
                        this.logger.error(`[TRACE] Span error: ${name}`, {
                            traceId,
                            spanId,
                            error: error.message
                        });
                    },
                    
                    // Get span context for propagation
                    getContext: () => ({
                        traceId: span.traceId,
                        spanId: span.spanId
                    })
                };
            },
            
            // Get active spans
            getActiveSpans: () => Array.from(spans.values()),
            
            // Extract context from headers (for propagation)
            extractContext: (headers) => {
                return {
                    traceId: headers['x-trace-id'] || headers['traceparent']?.split('-')[1],
                    spanId: headers['x-span-id']
                };
            },
            
            // Inject context into headers (for propagation)
            injectContext: (headers) => {
                // For W3C Trace Context format
                const traceId = `00${Date.now().toString(16)}${Math.random().toString(16).substring(2, 18)}`;
                const spanId = Math.random().toString(16).substring(2, 18);
                
                headers['traceparent'] = `00-${traceId}-${spanId}-01`;
                headers['x-trace-id'] = traceId;
                headers['x-span-id'] = spanId;
                
                return headers;
            }
        };
    }

    /**
     * Create a span wrapper for async operations
     */
    traceAsync(name, fn, attributes = {}) {
        const span = this.tracer.startSpan(name, { attributes });
        
        return fn(span)
            .then(result => {
                span.end({ success: true });
                return result;
            })
            .catch(error => {
                span.addError(error);
                span.end({ success: false });
                throw error;
            });
    }

    /**
     * ============ ALERTING ============
     */
    sendAlert(alert) {
        const alertEntry = {
            timestamp: new Date().toISOString(),
            service: this.config.serviceName,
            ...alert
        };
        
        this.emit('alert', alertEntry);
        
        // Log critical alerts
        if (alert.severity === 'critical') {
            this.logger.critical(`[ALERT] ${alert.title}`, alert);
        } else if (alert.severity === 'warning') {
            this.logger.warn(`[ALERT] ${alert.title}`, alert);
        }
        
        return alertEntry;
    }

    /**
     * Predefined alert conditions
     */
    checkAndAlert(conditions) {
        for (const condition of conditions) {
            if (condition.check()) {
                this.sendAlert({
                    title: condition.title,
                    message: condition.message,
                    severity: condition.severity || 'warning',
                    metadata: condition.metadata || {}
                });
            }
        }
    }

    /**
     * Get health status
     */
    getHealth() {
        return {
            status: 'healthy',
            service: this.config.serviceName,
            version: this.config.serviceVersion,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            metrics: {
                counters: this.metrics.getAll().counters.length,
                gauges: this.metrics.getAll().gauges.length,
                histograms: this.metrics.getAll().histograms.length
            },
            tracing: {
                activeSpans: this.tracer.getActiveSpans().length,
                samplingRate: this.config.tracingSampleRate
            }
        };
    }

    /**
     * Shutdown gracefully
     */
    async shutdown() {
        this.logger.info('[OBSERVABILITY] Shutting down...');
        
        // Flush any pending logs
        // Close any file handles
        // etc.
        
        return true;
    }
}

// ============ FACTORY FUNCTION ============
function createObservability(config) {
    return new ObservabilityService(config);
}

// ============ DEFAULT INSTANCE ============
let defaultInstance = null;

function getObservability(config = {}) {
    if (!defaultInstance) {
        defaultInstance = new ObservabilityService(config);
    }
    return defaultInstance;
}

module.exports = {
    ObservabilityService,
    createObservability,
    getObservability
};
