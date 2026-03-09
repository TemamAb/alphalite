const { describe, it, expect, beforeEach, jest } = require('@jest/globals');

// Mock dependencies before requiring the service
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    child: jest.fn().mockReturnThis(),
};

jest.mock('winston', () => ({
    createLogger: jest.fn(() => mockLogger),
    format: {
        combine: jest.fn(),
        timestamp: jest.fn(),
        errors: jest.fn(),
        json: jest.fn(),
    },
    transports: {
        Console: jest.fn(),
    },
}));

const mockCounter = { inc: jest.fn() };
const mockGauge = { inc: jest.fn(), set: jest.fn() };
const mockHistogram = { startTimer: jest.fn(() => jest.fn()) };
const mockRegistry = { metrics: jest.fn().mockResolvedValue('metrics_output') };

jest.mock('prom-client', () => ({
    Registry: jest.fn(() => mockRegistry),
    collectDefaultMetrics: jest.fn(),
    Counter: jest.fn(() => mockCounter),
    Gauge: jest.fn(() => mockGauge),
    Histogram: jest.fn(() => mockHistogram),
}));

const observability = require('../../engine/services/ObservabilityService');

describe('ObservabilityService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Logging', () => {
        it('should log info messages', () => {
            observability.info('Test message', { key: 'value' });
            expect(mockLogger.info).toHaveBeenCalledWith('Test message', { key: 'value' });
        });

        it('should log error messages and increment error metric', () => {
            const error = new Error('Test error');
            observability.error('Error occurred', error, { context: 'test' });
            
            expect(mockLogger.error).toHaveBeenCalledWith('Error occurred', { context: 'test', error });
            expect(mockCounter.inc).toHaveBeenCalledWith({ 
                type: 'Error', 
                severity: 'error' 
            });
        });

        it('should create a child logger with correlation ID', () => {
            const child = observability.getLogger('test-id');
            expect(mockLogger.child).toHaveBeenCalledWith({ correlationId: 'test-id' });
            expect(child).toBe(mockLogger); // Since we mocked child to return this
        });

        it('should generate correlation ID if not provided', () => {
            observability.getLogger();
            expect(mockLogger.child).toHaveBeenCalledWith(
                expect.objectContaining({ correlationId: expect.any(String) })
            );
        });
    });

    describe('Metrics', () => {
        it('should record HTTP requests', () => {
            observability.recordRequest('GET', '/api/test', 200);
            expect(mockCounter.inc).toHaveBeenCalledWith({ 
                method: 'GET', 
                route: '/api/test', 
                status: 200 
            });
        });

        it('should record trade execution', () => {
            observability.recordTrade('Arbitrage', 'ethereum', 'success', 0.5);
            
            expect(mockCounter.inc).toHaveBeenCalledWith({ 
                strategy: 'Arbitrage', 
                chain: 'ethereum', 
                status: 'success' 
            });
            
            // Should increment profit gauge for success
            expect(mockGauge.inc).toHaveBeenCalledWith(0.5);
        });

        it('should not increment profit for failed trades', () => {
            observability.recordTrade('Arbitrage', 'ethereum', 'failed', 0);
            
            expect(mockCounter.inc).toHaveBeenCalledWith({ 
                strategy: 'Arbitrage', 
                chain: 'ethereum', 
                status: 'failed' 
            });
            
            expect(mockGauge.inc).not.toHaveBeenCalled();
        });

        it('should start operation timer', () => {
            const endTimer = observability.startTimer('db_query');
            expect(mockHistogram.startTimer).toHaveBeenCalledWith({ operation: 'db_query' });
            expect(typeof endTimer).toBe('function');
        });

        it('should retrieve metrics for scraping', async () => {
            const metrics = await observability.getMetrics();
            expect(mockRegistry.metrics).toHaveBeenCalled();
            expect(metrics).toBe('metrics_output');
        });
    });

    describe('Alerting', () => {
        it('should log warning for alerts', async () => {
            await observability.sendAlert('High CPU', 'Usage > 90%', 'warning');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                '[ALERT] High CPU: Usage > 90%', 
                { severity: 'warning' }
            );
        });

        // Note: We are not testing the actual webhook fetch here as it is commented out 
        // or requires mocking global fetch/axios which is implementation specific.
        // The test verifies the logging and structure.
    });
});