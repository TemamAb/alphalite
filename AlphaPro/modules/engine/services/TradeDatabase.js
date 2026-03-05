/**
 * Trade Database Service
 * 
 * Implements Protocol 9: Analytics Database
 * Stores "Paper" and "Live" trade data plus agent logs
 * for analysis and Alpha-Copilot projections
 */

const { Pool } = require('pg');

class TradeDatabase {
    constructor(connectionString = null) {
        this.pool = null;
        this.connectionString = connectionString || process.env.DATABASE_URL;
        
        if (this.connectionString) {
            this.connect();
        } else {
            console.warn('[TRADE DB] No DATABASE_URL - running in-memory mode');
            this.inMemoryMode = true;
            this.trades = [];
            this.agentLogs = [];
        }
    }

    connect() {
        try {
            this.pool = new Pool({
                connectionString: this.connectionString,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });
            
            this.pool.on('error', (err) => {
                console.error('[TRADE DB] Unexpected error:', err);
            });
            
            console.log('[TRADE DB] Connected to PostgreSQL');
            this.initSchema();
        } catch (error) {
            console.error('[TRADE DB] Connection failed:', error.message);
            this.inMemoryMode = true;
        }
    }

    async initSchema() {
        if (!this.pool) return;
        
        try {
            // Create trades table
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS trades (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP DEFAULT NOW(),
                    mode VARCHAR(10) NOT NULL, -- 'PAPER' or 'LIVE'
                    chain VARCHAR(20),
                    strategy VARCHAR(50),
                    token_in VARCHAR(50),
                    token_out VARCHAR(50),
                    amount_in DECIMAL(30, 0),
                    amount_out DECIMAL(30, 0),
                    profit DECIMAL(30, 18),
                    gas_fee DECIMAL(30, 0),
                    status VARCHAR(20), -- 'SUCCESS', 'FAILED', 'PENDING'
                    tx_hash VARCHAR(100),
                    error_message TEXT,
                    slippage DECIMAL(10, 6),
                    execution_time_ms INTEGER
                )
            `);

            // Create agent logs table
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS agent_logs (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP DEFAULT NOW(),
                    agent VARCHAR(30) NOT NULL, -- 'SENTINEL', 'MEV_ENGINEER', 'ORACLE', 'HUNTER'
                    action VARCHAR(50),
                    details JSONB,
                    risk_score DECIMAL(5, 4),
                    approved BOOLEAN,
                    metadata JSONB
                )
            `);

            // Create performance metrics table
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP DEFAULT NOW(),
                    mode VARCHAR(10),
                    total_trades INTEGER,
                    successful_trades INTEGER,
                    total_profit DECIMAL(30, 18),
                    total_gas_fees DECIMAL(30, 0),
                    win_rate DECIMAL(5, 2),
                    avg_profit_per_trade DECIMAL(30, 18),
                    avg_execution_time_ms INTEGER
                )
            `);

            // Create indexes for faster queries
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp);
                CREATE INDEX IF NOT EXISTS idx_trades_mode ON trades(mode);
                CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
                CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent);
                CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON agent_logs(timestamp);
            `);

            console.log('[TRADE DB] Schema initialized');
        } catch (error) {
            console.error('[TRADE DB] Schema init error:', error.message);
        }
    }

    /**
     * Log a trade execution
     */
    async logTrade(trade) {
        const query = `
            INSERT INTO trades (
                mode, chain, strategy, token_in, token_out,
                amount_in, amount_out, profit, gas_fee,
                status, tx_hash, error_message, slippage, execution_time_ms
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
        `;
        
        const values = [
            trade.mode,
            trade.chain,
            trade.strategy,
            trade.tokenIn,
            trade.tokenOut,
            trade.amountIn,
            trade.amountOut,
            trade.profit || 0,
            trade.gasFee || 0,
            trade.status,
            trade.txHash || null,
            trade.errorMessage || null,
            trade.slippage || null,
            trade.executionTimeMs || null
        ];

        if (this.inMemoryMode) {
            const record = { id: this.trades.length + 1, ...trade, timestamp: new Date() };
            this.trades.push(record);
            return record;
        }

        try {
            const result = await this.pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('[TRADE DB] Log trade error:', error.message);
            return null;
        }
    }

    /**
     * Log agent action
     */
    async logAgentAction(agent, action, details = {}, riskScore = null, approved = true) {
        const query = `
            INSERT INTO agent_logs (agent, action, details, risk_score, approved, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;

        const values = [
            agent,
            action,
            JSON.stringify(details),
            riskScore,
            approved,
            JSON.stringify({ 
                timestamp: new Date().toISOString(),
                ...details 
            })
        ];

        if (this.inMemoryMode) {
            const record = { 
                id: this.agentLogs.length + 1, 
                agent, action, details, riskScore, approved, 
                timestamp: new Date() 
            };
            this.agentLogs.push(record);
            return record;
        }

        try {
            const result = await this.pool.query(query, values);
            return result.rows[0];
        } catch (error) {
console.error('[TRADE DB] Log agent error:', error.message);
            return null;
        }
    }

    /**
     * Get trade history
     */
    async getTrades(options = {}) {
        const { mode, limit = 100, offset = 0, status } = options;
        
        let query = 'SELECT * FROM trades';
        const conditions = [];
        const values = [];
        let paramIndex = 1;

        if (mode) {
            conditions.push(`mode = $${paramIndex++}`);
            values.push(mode);
        }

        if (status) {
            conditions.push(`status = $${paramIndex++}`);
            values.push(status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        values.push(limit, offset);

        if (this.inMemoryMode) {
            let filtered = this.trades;
            if (mode) filtered = filtered.filter(t => t.mode === mode);
            if (status) filtered = filtered.filter(t => t.status === status);
            return filtered.slice(offset, offset + limit);
        }

        try {
            const result = await this.pool.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('[TRADE DB] Get trades error:', error.message);
            return [];
        }
    }

    /**
     * Get performance summary
     */
    async getPerformanceSummary(mode = 'PAPER') {
        const query = `
            SELECT 
                COUNT(*) as total_trades,
                SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful_trades,
                SUM(profit) as total_profit,
                SUM(gas_fee) as total_gas_fees,
                AVG(profit) as avg_profit,
                AVG(execution_time_ms) as avg_execution_time,
                AVG(CASE WHEN status = 'SUCCESS' THEN profit ELSE NULL END) as avg_successful_profit
            FROM trades 
            WHERE mode = $1
        `;

        if (this.inMemoryMode) {
            const trades = this.trades.filter(t => t.mode === mode);
            const successful = trades.filter(t => t.status === 'SUCCESS');
            return {
                total_trades: trades.length,
                successful_trades: successful.length,
                total_profit: trades.reduce((sum, t) => sum + (t.profit || 0), 0),
                total_gas_fees: trades.reduce((sum, t) => sum + (t.gasFee || 0), 0),
                avg_profit: trades.length > 0 ? trades.reduce((sum, t) => sum + (t.profit || 0), 0) / trades.length : 0,
                avg_execution_time: trades.length > 0 ? trades.reduce((sum, t) => sum + (t.executionTimeMs || 0), 0) / trades.length : 0
            };
        }

        try {
            const result = await this.pool.query(query, [mode]);
            const row = result.rows[0];
            return {
                total_trades: parseInt(row.total_trades) || 0,
                successful_trades: parseInt(row.successful_trades) || 0,
                total_profit: parseFloat(row.total_profit) || 0,
                total_gas_fees: parseFloat(row.total_gas_fees) || 0,
                avg_profit: parseFloat(row.avg_profit) || 0,
                avg_execution_time: parseFloat(row.avg_execution_time) || 0,
                avg_successful_profit: parseFloat(row.avg_successful_profit) || 0
            };
        } catch (error) {
            console.error('[TRADE DB] Get summary error:', error.message);
            return null;
        }
    }

    /**
     * Get agent activity log
     */
    async getAgentLogs(agent = null, limit = 50) {
        let query = 'SELECT * FROM agent_logs';
        const values = [];

        if (agent) {
            query += ' WHERE agent = $1';
            values.push(agent);
        }

        query += ' ORDER BY timestamp DESC LIMIT $' + (values.length + 1);
        values.push(limit);

        if (this.inMemoryMode) {
            let logs = this.agentLogs;
            if (agent) logs = logs.filter(l => l.agent === agent);
            return logs.slice(0, limit);
        }

        try {
            const result = await this.pool.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('[TRADE DB] Get agent logs error:', error.message);
            return [];
        }
    }

    /**
     * Get performance projection for Alpha-Copilot
     */
    async getProjection() {
        const paperPerf = await this.getPerformanceSummary('PAPER');
        
        if (!paperPerf || paperPerf.total_trades === 0) {
            return {
                ready: false,
                reason: 'No paper trading data available',
                confidence: 0
            };
        }

        const winRate = (paperPerf.successful_trades / paperPerf.total_trades) * 100;
        const avgProfit = paperPerf.avg_profit || 0;
        
        // Project to 24h and 30d
        const tradesPerHour = paperPerf.total_trades / 24; // Assume 24h running
        const projected24h = avgProfit * tradesPerHour * 24;
        const projected30d = projected24h * 30;

        // Calculate confidence based on data volume
        const confidence = Math.min(95, (paperPerf.total_trades / 100) * 30 + 20);

        return {
            ready: confidence >= 50,
            confidence: confidence.toFixed(1),
            paper_performance: {
                total_trades: paperPerf.total_trades,
                win_rate: winRate.toFixed(1),
                avg_profit: avgProfit.toFixed(4)
            },
            projection: {
                daily: projected24h.toFixed(2),
                monthly: projected30d.toFixed(2)
            }
        };
    }

    /**
     * Close connection
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
        }
    }
}

module.exports = TradeDatabase;
