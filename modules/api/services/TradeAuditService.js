const { PrismaClient } = require('@prisma/client');
const winston = require('winston');

// Initialize Prisma Client
const prisma = new PrismaClient();

// Configure structured logging for audit trail
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'trade-audit-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/trade-audit.log' }),
    new winston.transports.Console()
  ],
});

class TradeAuditService {
  /**
   * Persist trade execution details to the database and audit log.
   * @param {Object} tradeData - The trade execution data.
   */
  async logTradeExecution(tradeData) {
    try {
      // 1. Structured Logging (File/Stream)
      logger.info('Trade Execution Audit', { ...tradeData, timestamp: new Date() });

      // 2. Database Persistence
      // Ensure schema matches schema.prisma definitions
      const record = await prisma.trade.create({
        data: {
          transactionHash: tradeData.transactionHash,
          blockNumber: tradeData.blockNumber ? parseInt(tradeData.blockNumber) : null,
          timestamp: tradeData.timestamp || new Date(),
          executorAddress: tradeData.executorAddress,
          profit: parseFloat(tradeData.profit),
          gasUsed: tradeData.gasUsed ? parseInt(tradeData.gasUsed) : null,
          status: tradeData.status,
          strategy: tradeData.strategy,
          chain: tradeData.chain,
          pair: tradeData.pair
        }
      });

      return record;
    } catch (error) {
      logger.error('Failed to persist trade audit record', { error: error.message, tradeData });
      // We do not throw here to prevent disrupting the trading loop, but we alert
      console.error('[AUDIT] CRITICAL: Database write failed for trade audit.');
    }
  }

  async getTradeHistory({ page = 1, limit = 50, strategy, status }) {
    const where = {};
    if (strategy) where.strategy = strategy;
    if (status) where.status = status;

    const [trades, total] = await prisma.$transaction([
        prisma.trade.findMany({
            where,
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { timestamp: 'desc' }
        }),
        prisma.trade.count({ where })
    ]);

    return {
        data: trades,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
  }
}

module.exports = new TradeAuditService();