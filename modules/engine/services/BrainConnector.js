/**
 * Brain Connector Service
 * Acts as the IPC (Inter-Process Communication) bridge between:
 * 1. The Node.js Trading Engine (Execution & HFT)
 * 2. The Python AI Oracle (Machine Learning & Strategy Optimization)
 */
const axios = require('axios');

class BrainConnector {
    constructor() {
        // Python Brain runs on port 5000 by default
        this.brainUrl = process.env.BRAIN_URL || 'http://localhost:5000';
        this.isConnected = false;
        this.lastRegime = 'NORMAL';
        this.lastCheck = 0;
    }

    /**
     * Check health of the Python AI module
     */
    async checkConnection() {
        try {
            await axios.get(`${this.brainUrl}/status`, { timeout: 2000 });
            if (!this.isConnected) {
                console.log('[BRAIN] 🧠 Connected to Python Oracle successfully.');
            }
            this.isConnected = true;
            return true;
        } catch (error) {
            if (this.isConnected) {
                console.warn('[BRAIN] ⚠️ Lost connection to Python Oracle.');
            }
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Get the current market regime from the AI
     * Returns: 'NORMAL', 'HIGH_VOLATILITY', 'LOW_VOLATILITY', 'TRENDING'
     */
    async detectMarketRegime() {
        // Cache regime for 10 seconds to reduce IPC overhead
        if (Date.now() - this.lastCheck < 10000) {
            return this.lastRegime;
        }

        if (!this.isConnected && !(await this.checkConnection())) {
            return 'NORMAL'; // Fallback
        }

        try {
            const response = await axios.get(`${this.brainUrl}/regime`, { timeout: 3000 });
            if (response.data && response.data.regime) {
                this.lastRegime = response.data.regime;
                this.lastCheck = Date.now();
                return this.lastRegime;
            }
        } catch (error) {
            console.error('[BRAIN] Failed to detect regime:', error.message);
        }
        return 'NORMAL';
    }

    /**
     * Get the theoretical maximum performance metrics calculated by the AI
     */
    async getTheoreticalMaximum() {
        if (!this.isConnected) return null;
        try {
            const response = await axios.get(`${this.brainUrl}/theoretical-max`, { timeout: 5000 });
            return response.data;
        } catch (error) {
            return null;
        }
    }

    async getUnifiedStatus() {
        return {
            connected: this.isConnected,
            regime: this.lastRegime,
            url: this.brainUrl
        };
    }
}

module.exports = new BrainConnector();