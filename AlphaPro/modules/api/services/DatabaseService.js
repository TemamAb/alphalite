/**
 * Enterprise Database Service
 * 
 * Provides robust PostgreSQL database operations
 * with connection pooling, retry logic, and proper error handling
 */

const { PrismaClient } = require('@prisma/client');

class DatabaseService {
    constructor() {
        this.prisma = null;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 5;
    }
    
    /**
     * Initialize database connection with retry logic
     */
    async connect() {
        if (this.isConnected) {
            return this.prisma;
        }
        
        this.prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development' 
                ? ['query', 'error', 'warn'] 
                : ['error'],
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                }
            }
        });
        
        // Test connection with retries
        while (this.retryCount < this.maxRetries) {
            try {
                await this.prisma.$connect();
                this.isConnected = true;
                this.retryCount = 0;
                
                console.log('[DB] Connected to PostgreSQL');
                
                // Set up connection error handlers
                this.prisma.$on('error', (e) => {
                    console.error('[DB] Connection error:', e);
                    this.isConnected = false;
                });
                
                return this.prisma;
            } catch (error) {
                this.retryCount++;
                console.error(`[DB] Connection failed (attempt ${this.retryCount}/${this.maxRetries}):`, error.message);
                
                if (this.retryCount >= this.maxRetries) {
                    throw new Error('Database connection failed after max retries');
                }
                
                // Exponential backoff
                await new Promise(resolve => 
                    setTimeout(resolve, Math.pow(2, this.retryCount) * 1000)
                );
            }
        }
    }
    
    /**
     * Disconnect from database
     */
    async disconnect() {
        if (this.prisma) {
            await this.prisma.$disconnect();
            this.isConnected = false;
            console.log('[DB] Disconnected from PostgreSQL');
        }
    }
    
    /**
     * Execute transaction with automatic rollback on error
     */
    async transaction(fn) {
        if (!this.prisma) {
            await this.connect();
        }
        
        return await this.prisma.$transaction(fn);
    }
    
    // =====================================================
    // TRADE OPERATIONS
    // =====================================================
    
    async createTrade(tradeData) {
        return await this.prisma.trade.create({
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
                status: tradeData.status || 'PENDING'
            }
        });
    }
    
    async getTrades(filters = {}) {
        const { limit = 50, offset = 0, walletAddress, chain, status, fromDate, toDate } = filters;
        
        const where = {};
        
        if (walletAddress) where.walletAddress = walletAddress;
        if (chain) where.chain = chain;
        if (status) where.status = status;
        if (fromDate || toDate) {
            where.executedAt = {};
            if (fromDate) where.executedAt.gte = new Date(fromDate);
            if (toDate) where.executedAt.lte = new Date(toDate);
        }
        
        const [trades, total] = await Promise.all([
            this.prisma.trade.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { executedAt: 'desc' }
            }),
            this.prisma.trade.count({ where })
        ]);
        
        return { trades, total, limit, offset };
    }
    
    async updateTradeStatus(tradeId, status, result = {}) {
        return await this.prisma.trade.update({
            where: { id: tradeId },
            data: {
                status,
                ...result
            }
        });
    }
    
    // =====================================================
    // WALLET OPERATIONS
    // =====================================================
    
    async createWallet(walletData) {
        return await this.prisma.wallet.create({
            data: {
                address: walletData.address,
                privateKeyEncrypted: walletData.privateKeyEncrypted,
                chain: walletData.chain,
                balance: walletData.balance || 0
            }
        });
    }
    
    async getWallets() {
        return await this.prisma.wallet.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
    }
    
    async updateWalletBalance(walletAddress, newBalance) {
        return await this.prisma.wallet.update({
            where: { address: walletAddress },
            data: { balance: newBalance }
        });
    }
    
    // =====================================================
    // AUDIT LOG OPERATIONS
    // =====================================================
    
    async createAuditLog(logData) {
        return await this.prisma.auditLog.create({
            data: {
                action: logData.action,
                entityType: logData.entityType,
                entityId: logData.entityId,
                details: logData.details,
                userEmail: logData.userEmail,
                ipAddress: logData.ipAddress
            }
        });
    }
    
    async getAuditLogs(filters = {}) {
        const { limit = 100, offset = 0, action, entityType, userEmail, fromDate } = filters;
        
        const where = {};
        
        if (action) where.action = action;
        if (entityType) where.entityType = entityType;
        if (userEmail) where.userEmail = userEmail;
        if (fromDate) where.createdAt = { gte: new Date(fromDate) };
        
        return await this.prisma.auditLog.findMany({
            where,
            skip: offset,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });
    }
    
    // =====================================================
    // METRICS OPERATIONS
    // =====================================================
    
    async recordMetric(name, value, labels = {}) {
        return await this.prisma.metric.create({
            data: {
                name,
                value,
                labels
            }
        });
    }
    
    async getMetrics(name, fromDate, toDate) {
        return await this.prisma.metric.findMany({
            where: {
                name,
                recordedAt: {
                    gte: fromDate ? new Date(fromDate) : undefined,
                    lte: toDate ? new Date(toDate) : undefined
                }
            },
            orderBy: { recordedAt: 'desc' }
        });
    }
    
    // =====================================================
    // USER OPERATIONS
    // =====================================================
    
    async createUser(userData) {
        return await this.prisma.user.create({
            data: {
                email: userData.email,
                passwordHash: userData.passwordHash,
                role: userData.role || 'user'
            }
        });
    }
    
    async getUserByEmail(email) {
        return await this.prisma.user.findUnique({
            where: { email }
        });
    }
    
    async getUserById(id) {
        return await this.prisma.user.findUnique({
            where: { id }
        });
    }
    
    async updateUserMFA(userId, mfaEnabled, mfaSecret = null) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: {
                mfaEnabled,
                mfaSecret
            }
        });
    }
    
    // =====================================================
    // SESSION OPERATIONS
    // =====================================================
    
    async createSession(sessionData) {
        return await this.prisma.userSession.create({
            data: {
                userId: sessionData.userId,
                token: sessionData.token,
                ipAddress: sessionData.ipAddress,
                userAgent: sessionData.userAgent,
                expiresAt: sessionData.expiresAt
            }
        });
    }
    
    async getSession(token) {
        return await this.prisma.userSession.findUnique({
            where: { token },
            include: { user: true }
        });
    }
    
    async deleteSession(token) {
        return await this.prisma.userSession.delete({
            where: { token }
        });
    }
    
    async deleteExpiredSessions() {
        return await this.prisma.userSession.deleteMany({
            where: {
                expiresAt: { lt: new Date() }
            }
        });
    }
}

module.exports = new DatabaseService();
