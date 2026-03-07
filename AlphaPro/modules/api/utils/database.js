// database.js - Prisma database connection and utilities
// AlphaPro Enterprise Database Layer

let prisma = null;

/**
 * Initialize Prisma client
 * Returns the Prisma client instance
 */
function getPrismaClient() {
    if (prisma) {
        return prisma;
    }

    try {
        const { PrismaClient } = require('@prisma/client');
        prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
        console.log('[DATABASE] Prisma client initialized');
        return prisma;
    } catch (error) {
        console.error('[DATABASE] Failed to initialize Prisma:', error.message);
        return null;
    }
}

/**
 * Check database connection
 */
async function checkConnection() {
    const client = getPrismaClient();
    if (!client) {
        return { connected: false, error: 'Prisma not initialized' };
    }

    try {
        await client.$connect();
        console.log('[DATABASE] Connected to PostgreSQL');
        return { connected: true };
    } catch (error) {
        console.error('[DATABASE] Connection failed:', error.message);
        return { connected: false, error: error.message };
    }
}

/**
 * Close database connection
 */
async function disconnect() {
    if (prisma) {
        try {
            await prisma.$disconnect();
            console.log('[DATABASE] Disconnected from PostgreSQL');
            prisma = null;
        } catch (error) {
            console.error('[DATABASE] Disconnect error:', error.message);
        }
    }
}

/**
 * Health check for database
 */
async function healthCheck() {
    const client = getPrismaClient();
    if (!client) {
        return { healthy: false, message: 'Prisma not initialized' };
    }

    try {
        await client.$queryRaw`SELECT 1`;
        return { healthy: true };
    } catch (error) {
        return { healthy: false, message: error.message };
    }
}

// =====================================================
// TRADING OPERATIONS
// =====================================================

/**
 * Record a trade
 */
async function recordTrade(tradeData) {
    const client = getPrismaClient();
    if (!client) return null;

    return client.trade.create({
        data: {
            walletAddress: tradeData.walletAddress,
            chain: tradeData.chain,
            dex: tradeData.dex,
            tokenIn: tradeData.tokenIn,
            tokenOut: tradeData.tokenOut,
            amountIn: tradeData.amountIn,
            amountOut: tradeData.amountOut,
            profit: tradeData.profit,
            gasUsed: tradeData.gasUsed,
            status: tradeData.status || 'PENDING',
        },
    });
}

/**
 * Get trades by wallet
 */
async function getTradesByWallet(walletAddress, limit = 100) {
    const client = getPrismaClient();
    if (!client) return [];

    return client.trade.findMany({
        where: { walletAddress },
        orderBy: { executedAt: 'desc' },
        take: limit,
    });
}

/**
 * Get recent trades
 */
async function getRecentTrades(limit = 50) {
    const client = getPrismaClient();
    if (!client) return [];

    return client.trade.findMany({
        orderBy: { executedAt: 'desc' },
        take: limit,
    });
}

// =====================================================
// STRATEGY OPERATIONS
// =====================================================

/**
 * Get all active strategies
 */
async function getActiveStrategies() {
    const client = getPrismaClient();
    if (!client) return [];

    return client.strategy.findMany({
        where: { isActive: true },
    });
}

/**
 * Create or update strategy
 */
async function upsertStrategy(strategyData) {
    const client = getPrismaClient();
    if (!client) return null;

    return client.strategy.upsert({
        where: { name: strategyData.name },
        update: strategyData,
        create: strategyData,
    });
}

// =====================================================
// AUDIT LOG OPERATIONS
// =====================================================

/**
 * Record an audit log
 */
async function recordAuditLog(auditData) {
    const client = getPrismaClient();
    if (!client) return null;

    return client.auditLog.create({
        data: {
            action: auditData.action,
            entityType: auditData.entityType,
            entityId: auditData.entityId,
            details: auditData.details || {},
            userEmail: auditData.userEmail,
            ipAddress: auditData.ipAddress,
        },
    });
}

// =====================================================
// METRICS OPERATIONS
// =====================================================

/**
 * Record a metric
 */
async function recordMetric(name, value, labels = {}) {
    const client = getPrismaClient();
    if (!client) return null;

    return client.metric.create({
        data: {
            name,
            value,
            labels,
        },
    });
}

/**
 * Get metrics by name
 */
async function getMetrics(name, hours = 24) {
    const client = getPrismaClient();
    if (!client) return [];

    const since = new Date();
    since.setHours(since.getHours() - hours);

    return client.metric.findMany({
        where: {
            name,
            recordedAt: { gte: since },
        },
        orderBy: { recordedAt: 'desc' },
    });
}

module.exports = {
    getPrismaClient,
    checkConnection,
    disconnect,
    healthCheck,
    recordTrade,
    getTradesByWallet,
    getRecentTrades,
    getActiveStrategies,
    upsertStrategy,
    recordAuditLog,
    recordMetric,
    getMetrics,
};
