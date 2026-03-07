/**
 * MEV Engineer Unit Tests
 */

const MEVEngineer = require('../../engine/MEVEngineer');
const { ethers } = require('ethers');

// Mock axios for Flashbots
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({ data: { result: { bundleHash: '0x123' } } })
}));

describe('MEVEngineer', () => {
    let mevEngineer;
    const testConfig = {
        maxGasPrice: 100,
        targetGasPrice: 20,
        priorityFee: 2,
        flashbotsEnabled: false,
        circuitBreakerEnabled: true,
        circuitBreakerThreshold: 3,
        circuitBreakerCooldown: 5000,
        rpcUrls: {
            ethereum: ['https://rpc1.example.com', 'https://rpc2.example.com'],
            arbitrum: ['https://arb1.example.com']
        }
    };

    beforeEach(() => {
        mevEngineer = new MEVEngineer(testConfig);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should initialize with default values', () => {
            const defaultEngine = new MEVEngineer();
            
            expect(defaultEngine.maxGasPrice).toBe(100);
            expect(defaultEngine.targetGasPrice).toBe(20);
            expect(defaultEngine.priorityFee).toBe(2);
            expect(defaultEngine.flashbotsEnabled).toBe(false);
            expect(defaultEngine.circuitBreakerEnabled).toBe(true);
        });

        it('should accept custom configuration', () => {
            expect(mevEngineer.maxGasPrice).toBe(100);
            expect(mevEngineer.targetGasPrice).toBe(20);
            expect(mevEngineer.maxBundleSize).toBe(5);
        });

        it('should initialize RPC endpoints', () => {
            expect(mevEngineer.rpcEndpoints.ethereum).toHaveLength(2);
            expect(mevEngineer.rpcEndpoints.arbitrum).toHaveLength(1);
        });

        it('should initialize health scores', () => {
            const healthScores = mevEngineer.rpcHealthScores.get('ethereum');
            expect(healthScores).toHaveLength(2);
            expect(healthScores[0].score).toBe(100);
        });
    });

    describe('Circuit Breaker', () => {
        it('should start inactive', () => {
            expect(mevEngineer.circuitBreakerActive).toBe(false);
            expect(mevEngineer.consecutiveFailures).toBe(0);
        });

        it('should activate after threshold failures', () => {
            for (let i = 0; i < 3; i++) {
                mevEngineer._recordFailure();
            }
            
            expect(mevEngineer.circuitBreakerActive).toBe(true);
            expect(mevEngineer.consecutiveFailures).toBe(3);
        });

        it('should allow requests when not triggered', () => {
            expect(mevEngineer._checkCircuitBreaker()).toBe(true);
        });

        it('should block requests when active', () => {
            mevEngineer.circuitBreakerActive = true;
            mevEngineer.circuitBreakerUntil = Date.now() + 60000;
            
            expect(mevEngineer._checkCircuitBreaker()).toBe(false);
        });

        it('should reset after success', () => {
            mevEngineer.consecutiveFailures = 2;
            mevEngineer._recordSuccess();
            
            expect(mevEngineer.consecutiveFailures).toBe(0);
            expect(mevEngineer.circuitBreakerActive).toBe(false);
        });

        it('should emit circuit breaker events', () => {
            const handler = jest.fn();
            mevEngineer.on('circuitBreaker', handler);
            
            mevEngineer.triggerCircuitBreaker('Test trigger');
            
            expect(handler).toHaveBeenCalledWith({
                active: true,
                until: expect.any(Number),
                consecutiveFailures: expect.any(Number)
            });
        });
    });

    describe('RPC Health Management', () => {
        it('should select best RPC based on health', () => {
            const bestRPC = mevEngineer.getBestRPC('ethereum');
            expect(bestRPC).toBeDefined();
        });

        it('should update health on success', async () => {
            await mevEngineer._updateRPCHealth('ethereum', testConfig.rpcUrls.ethereum[0], true, 100);
            
            const healthScores = mevEngineer.rpcHealthScores.get('ethereum');
            expect(healthScores[0].score).toBeGreaterThan(100);
            expect(healthScores[0].successes).toBe(1);
        });

        it('should decrease health on failure', async () => {
            await mevEngineer._updateRPCHealth('ethereum', testConfig.rpcUrls.ethereum[0], false, 0);
            
            const healthScores = mevEngineer.rpcHealthScores.get('ethereum');
            expect(healthScores[0].score).toBeLessThan(100);
            expect(healthScores[0].failures).toBe(1);
        });

        it('should trigger cooldown after multiple failures', async () => {
            for (let i = 0; i < 3; i++) {
                await mevEngineer._updateRPCHealth('ethereum', testConfig.rpcUrls.ethereum[0], false, 0);
            }
            
            const healthScores = mevEngineer.rpcHealthScores.get('ethereum');
            expect(healthScores[0].cooldownUntil).toBeGreaterThan(Date.now());
        });

        it('should get RPC health status', () => {
            const status = mevEngineer.getRPCHealthStatus();
            
            expect(status.ethereum).toBeDefined();
            expect(status.ethereum).toHaveLength(2);
        });
    });

    describe('Gas Optimization', () => {
        it('should estimate confirmation time correctly', () => {
            expect(mevEngineer.estimateConfirmationTime(5)).toBe('< 30 seconds');
            expect(mevEngineer.estimateConfirmationTime(15)).toBe('30-60 seconds');
            expect(mevEngineer.estimateConfirmationTime(50)).toBe('1-3 minutes');
            expect(mevEngineer.estimateConfirmationTime(100)).toBe('3-10 minutes');
            expect(mevEngineer.estimateConfirmationTime(150)).toBe('> 10 minutes');
        });
    });

    describe('Chain ID Resolution', () => {
        it('should resolve chain IDs correctly', () => {
            expect(mevEngineer.getChainId('ethereum')).toBe(1);
            expect(mevEngineer.getChainId('mainnet')).toBe(1);
            expect(mevEngineer.getChainId('arbitrum')).toBe(42161);
            expect(mevEngineer.getChainId('optimism')).toBe(10);
            expect(mevEngineer.getChainId('polygon')).toBe(137);
            expect(mevEngineer.getChainId('base')).toBe(8453);
        });

        it('should default to Ethereum for unknown chains', () => {
            expect(mevEngineer.getChainId('unknown')).toBe(1);
            expect(mevEngineer.getChainId(null)).toBe(1);
        });
    });

    describe('Transaction Execution', () => {
        it('should return error for missing signer in LIVE mode', async () => {
            const result = await mevEngineer.executeTransaction({
                chain: 'ethereum',
                to: '0x123',
                data: '0x',
                mode: 'LIVE'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('No signer provided for LIVE transaction');
        });

        it('should simulate transaction in PAPER mode', async () => {
            const mockSigner = {
                signTransaction: jest.fn().mockResolvedValue('0xsigned')
            };
            
            const result = await mevEngineer.executeTransaction({
                chain: 'ethereum',
                to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0fEb1',
                data: '0x',
                value: 0.1,
                signer: mockSigner,
                mode: 'PAPER'
            });
            
            expect(result.success).toBe(true);
            expect(result.mode).toBe('PAPER');
            expect(result.simulationTime).toBeDefined();
        });

        it('should handle transaction errors gracefully', async () => {
            const result = await mevEngineer.executeTransaction({
                chain: 'ethereum',
                to: '0xinvalid',
                data: '0x',
                mode: 'LIVE'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('Bundle Execution', () => {
        it('should execute bundle sequentially by default', async () => {
            const mockSigner = {
                signTransaction: jest.fn().mockResolvedValue('0xsigned')
            };
            
            const transactions = [
                { to: '0x111', data: '0x', chain: 'ethereum' },
                { to: '0x222', data: '0x', chain: 'ethereum' }
            ];
            
            const result = await mevEngineer.executeBundle(transactions, {
                mode: 'PAPER',
                signer: mockSigner
            });
            
            expect(result.results).toHaveLength(2);
        });

        it('should return bundle result', () => {
            const result = mevEngineer.getStatus();
            
            expect(result.circuitBreaker).toBeDefined();
            expect(result.circuitBreaker.active).toBe(false);
            expect(result.circuitBreaker.threshold).toBe(3);
        });
    });

    describe('Configuration Updates', () => {
        it('should update configuration', () => {
            mevEngineer.updateConfig({
                maxGasPrice: 200,
                flashbotsEnabled: true
            });
            
            expect(mevEngineer.maxGasPrice).toBe(200);
            expect(mevEngineer.flashbotsEnabled).toBe(true);
        });

        it('should reset circuit breaker manually', () => {
            mevEngineer.circuitBreakerActive = true;
            mevEngineer.resetCircuitBreaker();
            
            expect(mevEngineer.circuitBreakerActive).toBe(false);
            expect(mevEngineer.consecutiveFailures).toBe(0);
        });
    });
});
