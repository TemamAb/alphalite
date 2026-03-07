// validation.test.js - Unit tests for validation utilities

const {
    ethAddressSchema,
    tradeRequestSchema,
    walletSchema,
    engineConfigSchema
} = require('../../api/utils/validation');

describe('Validation Utilities', () => {
    describe('ethAddressSchema', () => {
        it('should validate a correct Ethereum address', () => {
            const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
            const { error } = ethAddressSchema.validate(address);
            expect(error).toBeUndefined();
        });

        it('should reject an invalid Ethereum address', () => {
            const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0e'; // Too short
            const { error } = ethAddressSchema.validate(address);
            expect(error).toBeDefined();
        });

        it('should reject an address without 0x prefix', () => {
            const address = '742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
            const { error } = ethAddressSchema.validate(address);
            expect(error).toBeDefined();
        });
    });

    describe('tradeRequestSchema', () => {
        it('should validate a valid trade request', () => {
            const trade = {
                pair: 'ETH/USDC',
                side: 'BUY',
                amount: 1.5,
                price: 2500,
                type: 'LIMIT'
            };
            const { error, value } = tradeRequestSchema.validate(trade);
            expect(error).toBeUndefined();
            expect(value.type).toBe('LIMIT');
        });

        it('should reject a trade without required fields', () => {
            const trade = {
                pair: 'ETH/USDC',
                // Missing side and amount
            };
            const { error } = tradeRequestSchema.validate(trade);
            expect(error).toBeDefined();
        });

        it('should reject an invalid side', () => {
            const trade = {
                pair: 'ETH/USDC',
                side: 'HOLD', // Invalid
                amount: 1.5
            };
            const { error } = tradeRequestSchema.validate(trade);
            expect(error).toBeDefined();
        });

        it('should reject a negative amount', () => {
            const trade = {
                pair: 'ETH/USDC',
                side: 'BUY',
                amount: -1.5
            };
            const { error } = tradeRequestSchema.validate(trade);
            expect(error).toBeDefined();
        });
    });

    describe('walletSchema', () => {
        it('should validate a valid wallet', () => {
            const wallet = {
                address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
                name: 'Test Wallet',
                chain: 'ethereum'
            };
            const { error } = walletSchema.validate(wallet);
            expect(error).toBeUndefined();
        });

        it('should use default chain if not provided', () => {
            const wallet = {
                address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E'
            };
            const { value } = walletSchema.validate(wallet);
            expect(value.chain).toBe('ethereum');
        });

        it('should reject an invalid chain', () => {
            const wallet = {
                address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
                chain: 'bitcoin' // Invalid
            };
            const { error } = walletSchema.validate(wallet);
            expect(error).toBeDefined();
        });
    });

    describe('engineConfigSchema', () => {
        it('should validate a valid engine config', () => {
            const config = {
                mode: 'paper',
                maxPositionSize: 1,
                stopLoss: 5,
                takeProfit: 10,
                allowedSlippage: 0.5
            };
            const { error } = engineConfigSchema.validate(config);
            expect(error).toBeUndefined();
        });

        it('should use defaults for missing optional fields', () => {
            const config = {};
            const { value } = engineConfigSchema.validate(config);
            expect(value.mode).toBe('paper');
            expect(value.maxPositionSize).toBe(1);
            expect(value.stopLoss).toBe(5);
        });

        it('should reject an invalid mode', () => {
            const config = {
                mode: 'production' // Invalid
            };
            const { error } = engineConfigSchema.validate(config);
            expect(error).toBeDefined();
        });

        it('should reject stopLoss > 100', () => {
            const config = {
                stopLoss: 150 // Invalid
            };
            const { error } = engineConfigSchema.validate(config);
            expect(error).toBeDefined();
        });
    });
});
