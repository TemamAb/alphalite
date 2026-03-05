// tradingFixtures.js - Test fixtures for trading tests

const mockWalletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';

const mockTradeRequest = {
    pair: 'ETH/USDC',
    side: 'BUY',
    amount: 1.5,
    price: 2500,
    type: 'LIMIT'
};

const mockTradeResponse = {
    success: true,
    tradeId: '1234567890',
    pair: 'ETH/USDC',
    side: 'BUY',
    amount: 1.5,
    price: 2500,
    status: 'FILLED',
    timestamp: '2026-03-04T12:00:00Z'
};

const mockMarketData = {
    pair: 'ETH/USDC',
    price: 2500.00,
    change24h: 2.5,
    volume24h: 150000000,
    high24h: 2600.00,
    low24h: 2400.00,
    timestamp: '2026-03-04T12:00:00Z'
};

const mockWallet = {
    address: mockWalletAddress,
    name: 'Test Wallet',
    chain: 'ethereum',
    balance: 10.5,
    createdAt: '2026-01-01T00:00:00Z'
};

const mockEngineConfig = {
    mode: 'paper',
    maxPositionSize: 1,
    stopLoss: 5,
    takeProfit: 10,
    allowedSlippage: 0.5
};

const mockPosition = {
    id: 'pos_001',
    pair: 'ETH/USDC',
    side: 'LONG',
    size: 1.5,
    entryPrice: 2500,
    currentPrice: 2550,
    unrealizedPnL: 75,
    leverage: 3
};

module.exports = {
    mockWalletAddress,
    mockTradeRequest,
    mockTradeResponse,
    mockMarketData,
    mockWallet,
    mockEngineConfig,
    mockPosition
};
