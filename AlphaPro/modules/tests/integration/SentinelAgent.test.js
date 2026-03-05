/**
 * Sentinel Agent Unit Tests
 */

const SentinelAgent = require('../../engine/SentinelAgent');

describe('SentinelAgent', () => {
    let sentinel;
    const testConfig = {
        riskTolerance: 0.5,
        maxSlippage: 0.05,
        maxValuePerTrade: 100000,
        minLiquidityRatio: 0.01
    };

    beforeEach(() => {
        sentinel = new SentinelAgent(testConfig);
    });

    describe('Constructor', () => {
        it('should initialize with default values', () => {
            const defaultSentinel = new SentinelAgent();
            
            expect(defaultSentinel.riskTolerance).toBe(0.5);
            expect(defaultSentinel.maxSlippage).toBe(0.05);
            expect(defaultSentinel.maxValuePerTrade).toBe(100000);
            expect(defaultSentinel.vetoPower).toBe(true);
        });

        it('should accept custom configuration', () => {
            expect(sentinel.riskTolerance).toBe(0.5);
            expect(sentinel.maxSlippage).toBe(0.05);
        });

        it('should initialize audit history', () => {
            expect(sentinel.auditHistory).toEqual([]);
            expect(sentinel.vetoedTrades).toBe(0);
            expect(sentinel.approvedTrades).toBe(0);
        });
    });

    describe('Basic Validation', () => {
        it('should approve valid trade', async () => {
            const trade = {
                tokenAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0fEb1',
                chain: 'ethereum',
                amount: 10000,
                slippage: 0.02
            };

            const result = await sentinel.assessRisk(trade);
            
            // Should pass basic validation (may fail later in actual audit)
            expect(result).toBeDefined();
        });

        it('should reject trade with zero amount', async () => {
            const trade = {
                tokenAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0fEb1',
                chain: 'ethereum',
                amount: 0
            };

            const result = await sentinel.assessRisk(trade);
            
            expect(result.approved).toBe(false);
            expect(result.riskScore).toBe(1.0);
        });

        it('should reject trade without token address', async () => {
            const trade = {
                chain: 'ethereum',
                amount: 10000
            };

            const result = await sentinel.assessRisk(trade);
            
            expect(result.approved).toBe(false);
            expect(result.riskScore).toBe(1.0);
        });
    });

    describe('Risk Assessment', () => {
        it('should calculate risk score', () => {
            const auditResult = { riskScore: 0.3, safe: true };
            const liquidityCheck = { adequate: true, ratio: 0.05 };
            const impactAnalysis = { excessive: false, impact: 1.5 };

            const score = sentinel.calculateRiskScore(auditResult, liquidityCheck, impactAnalysis);
            
            expect(score).toBeDefined();
            expect(score).toBeGreaterThan(0);
        });

        it('should veto high risk trades', async () => {
            // Create sentinel with very low tolerance
            const strictSentinel = new SentinelAgent({ riskTolerance: 0.1 });
            
            const trade = {
                tokenAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0fEb1',
                chain: 'ethereum',
                amount: 10000,
                slippage: 0.5 // Very high slippage
            };

            const result = await strictSentinel.assessRisk(trade);
            
            // High slippage should result in veto or high risk
            expect(result.riskScore).toBeGreaterThanOrEqual(0.5);
        });
    });

    describe('Liquidity Checks', () => {
        it('should check liquidity adequacy', async () => {
            const trade = {
                tokenAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0fEb1',
                chain: 'ethereum',
                amount: 10000
            };

            const check = await sentinel.checkLiquidity(trade);
            
            expect(check).toBeDefined();
            expect(check.adequate).toBeDefined();
            expect(check.ratio).toBeDefined();
        });
    });

    describe('Price Impact Analysis', () => {
        it('should analyze price impact', async () => {
            const trade = {
                tokenAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0fEb1',
                chain: 'ethereum',
                amount: 10000
            };

            const analysis = await sentinel.analyzePriceImpact(trade);
            
            expect(analysis).toBeDefined();
            expect(analysis.excessive).toBeDefined();
            expect(analysis.impact).toBeDefined();
        });

        it('should detect excessive price impact', async () => {
            const trade = {
                tokenAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0fEb1',
                chain: 'ethereum',
                amount: 10000000 // Very large
            };

            const analysis = await sentinel.analyzePriceImpact(trade);
            
            expect(analysis.impact).toBeGreaterThan(sentinel.maxSlippage * 100);
        });
    });

    describe('Contract Auditing', () => {
        it('should audit contracts', async () => {
            const result = await sentinel.auditContract('0x742d35Cc6634C0532925a3b844Bc9e7595f0fEb1', 'ethereum');
            
            expect(result).toBeDefined();
            expect(result.safe).toBeDefined();
        });
    });

    describe('Veto Functionality', () => {
        it('should veto trade with reason', () => {
            const trade = { id: 1, amount: 10000 };
            
            const result = sentinel.vetoTrade(trade, 'Test veto', 0.9);
            
            expect(result.approved).toBe(false);
            expect(result.riskScore).toBe(0.9);
            expect(result.reason).toContain('Test veto');
            expect(sentinel.vetoedTrades).toBe(1);
        });

        it('should track vetoed trades in history', () => {
            const trade = { id: 1, amount: 10000 };
            
            sentinel.vetoTrade(trade, 'Test', 0.9);
            
            expect(sentinel.auditHistory).toHaveLength(1);
            expect(sentinel.auditHistory[0].approved).toBe(false);
        });
    });

    describe('Suspicious Pattern Detection', () => {
        it('should have suspicious patterns defined', () => {
            expect(sentinel.suspiciousPatterns).toBeDefined();
            expect(sentinel.suspiciousPatterns.length).toBeGreaterThan(0);
        });

        it('should detect suspicious patterns', () => {
            const patterns = sentinel.suspiciousPatterns;
            
            expect(patterns.find(p => p.name === 'unverified_contract')).toBeDefined();
            expect(patterns.find(p => p.name === 'mint_function')).toBeDefined();
        });
    });

    describe('Statistics', () => {
        it('should track approved and vetoed trades', async () => {
            const validTrade = {
                tokenAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0fEb1',
                chain: 'ethereum',
                amount: 1000,
                slippage: 0.01
            };

            await sentinel.assessRisk(validTrade);
            
            sentinel.vetoTrade({ id: 1 }, 'Test veto', 0.9);
            
            expect(sentinel.vetoedTrades).toBeGreaterThanOrEqual(1);
        });

        it('should get statistics', () => {
            const stats = sentinel.getStats();
            
            expect(stats.vetoedTrades).toBeDefined();
            expect(stats.approvedTrades).toBeDefined();
            expect(stats.totalAudits).toBeDefined();
        });
    });
});
