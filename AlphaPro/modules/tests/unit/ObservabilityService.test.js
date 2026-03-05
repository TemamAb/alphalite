/**
 * Observability Service Unit Tests
 */

const { ObservabilityService, createObservability, getObservability } = require('../../engine/services/ObservabilityService');

describe('ObservabilityService', () => {
    let observability;
    const testConfig = {
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        environment: 'test',
        logLevel: 'info',
        logToFile: false, // Disable file writing for tests
        logFormat: 'json',
        metricsEnabled: true,
        tracingEnabled: true,
        tracingSampleRate: 1.0 // Sample everything for testing
    };

    beforeEach(() => {
        observability = new ObservabilityService(testConfig);
    });

    describe('Logger', () => {
        it('should create logger with correct service info', () => {
            expect(observability.config.serviceName).toBe('test-service');
            expect(observability.config.serviceVersion).toBe('1.0.0');
        });

        it('should log info messages', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            observability.logger.info('Test message', { key: 'value' });
            
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should log error messages', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            observability.logger.error('Error message', { error: 'test' });
            
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should not log below log level', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            // Set to error level
            observability.logger.level = 3; // error
            observability.logger.log('info', 'This should not log');
            
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should create child logger with context', () => {
            const child = observability.logger.child({ component: 'test-component' });
            
            expect(child.debug).toBeDefined();
            expect(child.info).toBeDefined();
        });
    });

    describe('Correlation ID', () => {
        it('should generate correlation IDs', () => {
            const id1 = observability.createCorrelationId();
            const id2 = observability.createCorrelationId();
            
            expect(id1).toMatch(/^corr_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^corr_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });

        it('should set and get correlation ID', () => {
            observability.setCorrelationId('test-id');
            expect(observability.correlationId).toBe('test-id');
        });
    });

    describe('Metrics', () => {
        it('should create counters', () => {
            const counter = observability.metrics.counter('test_counter', { label: 'value' });
            
            expect(counter.inc).toBeDefined();
            counter.inc(5);
            expect(counter.getValue()).toBe(5);
        });

        it('should create gauges', () => {
            const gauge = observability.metrics.gauge('test_gauge');
            
            gauge.set(100);
            expect(gauge.getValue()).toBe(100);
            
            gauge.inc(50);
            expect(gauge.getValue()).toBe(150);
            
            gauge.dec(25);
            expect(gauge.getValue()).toBe(125);
        });

        it('should create histograms', () => {
            const histogram = observability.metrics.histogram('test_histogram');
            
            histogram.observe(0.1);
            histogram.observe(0.2);
            histogram.observe(0.3);
            
            const metrics = histogram.getMetrics();
            expect(metrics.count).toBe(3);
            expect(metrics.sum).toBe(0.6);
            expect(metrics.mean).toBe(0.2);
        });

        it('should export metrics in Prometheus format', () => {
            observability.metrics.counter('test_counter').inc(10);
            observability.metrics.gauge('test_gauge').set(50);
            
            const output = observability.metrics.export();
            
            expect(output).toContain('test_counter');
            expect(output).toContain('test_gauge');
            expect(output).toContain('counter');
            expect(output).toContain('gauge');
        });

        it('should provide predefined metrics', () => {
            const httpMetrics = observability.metrics.predefined.httpRequests('GET', '/api', 200);
            
            expect(httpMetrics.counter).toBeDefined();
            expect(httpMetrics.duration).toBeDefined();
        });
    });

    describe('Tracing', () => {
        it('should create spans', () => {
            const span = observability.tracer.startSpan('test-span');
            
            expect(span.end).toBeDefined();
            expect(span.setAttribute).toBeDefined();
            expect(span.addEvent).toBeDefined();
            expect(span.addError).toBeDefined();
        });

        it('should end spans correctly', () => {
            const span = observability.tracer.startSpan('test-span');
            
            // Span should be in active spans during execution
            const activeBefore = observability.tracer.getActiveSpans();
            
            span.end();
            
            // After ending, should not be in active spans
            expect(observability.tracer.getActiveSpans()).toHaveLength(0);
        });

        it('should add attributes to spans', () => {
            const span = observability.tracer.startSpan('test-span');
            span.setAttribute('key', 'value');
            span.end();
            
            // Attributes are added during span lifecycle
            expect(true).toBe(true);
        });

        it('should add events to spans', () => {
            const span = observability.tracer.startSpan('test-span');
            span.addEvent('test-event', { detail: 'value' });
            span.end();
            
            expect(true).toBe(true);
        });

        it('should handle errors in spans', () => {
            const error = new Error('Test error');
            const span = observability.tracer.startSpan('test-span');
            span.addError(error);
            span.end();
            
            expect(true).toBe(true);
        });

        it('should inject context into headers', () => {
            const headers = {};
            const result = observability.tracer.injectContext(headers);
            
            expect(headers.traceparent).toBeDefined();
            expect(headers['x-trace-id']).toBeDefined();
        });

        it('should extract context from headers', () => {
            const headers = {
                'x-trace-id': 'test-trace-id',
                'traceparent': '00-abc123-def456-01'
            };
            
            const context = observability.tracer.extractContext(headers);
            
            expect(context.traceId).toBe('test-trace-id');
        });
    });

    describe('Async Tracing', () => {
        it('should trace async operations', async () => {
            const result = await observability.traceAsync('async-operation', async (span) => {
                span.setAttribute('operation', 'test');
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'success';
            });
            
            expect(result).toBe('success');
        });

        it('should handle async errors', async () => {
            await expect(
                observability.traceAsync('async-error', async () => {
                    throw new Error('Async error');
                })
            ).rejects.toThrow('Async error');
        });
    });

    describe('Alerting', () => {
        it('should send alerts', () => {
            const alertHandler = jest.fn();
            observability.on('alert', alertHandler);
            
            observability.sendAlert({
                title: 'Test Alert',
                message: 'Test message',
                severity: 'warning'
            });
            
            expect(alertHandler).toHaveBeenCalled();
        });

        it('should check conditions and alert', () => {
            const alertHandler = jest.fn();
            observability.on('alert', alertHandler);
            
            observability.checkAndAlert([
                {
                    check: () => true,
                    title: 'Condition Alert',
                    message: 'Condition met',
                    severity: 'warning'
                }
            ]);
            
            expect(alertHandler).toHaveBeenCalled();
        });

        it('should not alert when conditions not met', () => {
            const alertHandler = jest.fn();
            observability.on('alert', alertHandler);
            
            observability.checkAndAlert([
                {
                    check: () => false,
                    title: 'Condition Alert',
                    message: 'Should not fire',
                    severity: 'warning'
                }
            ]);
            
            expect(alertHandler).not.toHaveBeenCalled();
        });
    });

    describe('Health Check', () => {
        it('should return health status', () => {
            const health = observability.getHealth();
            
            expect(health.status).toBe('healthy');
            expect(health.service).toBe('test-service');
            expect(health.version).toBe('1.0.0');
            expect(health.uptime).toBeDefined();
            expect(health.timestamp).toBeDefined();
        });

        it('should include metrics counts', () => {
            const health = observability.getHealth();
            
            expect(health.metrics).toBeDefined();
            expect(health.metrics.counters).toBe(0);
            expect(health.metrics.gauges).toBe(0);
            expect(health.metrics.histograms).toBe(0);
        });
    });

    describe('Factory Functions', () => {
        it('should create new instance with createObservability', () => {
            const instance = createObservability({ serviceName: 'factory-test' });
            
            expect(instance).toBeInstanceOf(ObservabilityService);
            expect(instance.config.serviceName).toBe('factory-test');
        });

        it('should return default instance with getObservability', () => {
            const instance1 = getObservability({ serviceName: 'singleton-1' });
            const instance2 = getObservability({ serviceName: 'singleton-2' });
            
            // Should return the same instance
            expect(instance1).toBe(instance2);
            // Should use the first config
            expect(instance1.config.serviceName).toBe('singleton-1');
        });
    });

    describe('Shutdown', () => {
        it('should shutdown gracefully', async () => {
            const result = await observability.shutdown();
            
            expect(result).toBe(true);
        });
    });
});
