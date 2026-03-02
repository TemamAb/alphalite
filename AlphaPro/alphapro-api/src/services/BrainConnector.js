/**
 * AlphaPro Brain Connector
 * Integrates Ranking Engine, AI Optimizer, and Python Brain
 * for unified intelligent decision making
 */

const EventEmitter = require('events');
const axios = require('axios');

class BrainConnector extends EventEmitter {
    constructor() {
        super();
        
        // Brain API URL
        this.brainUrl = process.env.BRAIN_URL || 'http://localhost:5000';
        
        // Integration state
        this.isConnected = false;
        this.lastBrainUpdate = null;
        
        // Start connecting to brain
        this.connectToBrain();
        
        // Sync interval
        this.syncInterval = 30000; // 30 seconds
        this.startSync();
    }
    
    async connectToBrain() {
        try {
            const response = await axios.get(`${this.brainUrl}/api/health`, { timeout: 5000 });
            if (response.data.status === 'ok') {
                this.isConnected = true;
                console.log('[BRAIN] ✅ Connected to AlphaPro Brain');
                
                // Get initial configuration
                await this.syncBrainConfig();
            }
        } catch (error) {
            console.log('[BRAIN] ⚠️ Brain not available, running in standalone mode');
            this.isConnected = false;
        }
    }
    
    async syncBrainConfig() {
        if (!this.isConnected) return;
        
        try {
            // Get optimal config from brain
            const response = await axios.get(`${this.brainUrl}/api/oracle/config`, { timeout: 5000 });
            if (response.data) {
                this.lastBrainUpdate = Date.now();
                this.emit('brainConfigUpdate', response.data);
                console.log('[BRAIN] 📥 Received config from Oracle');
            }
        } catch (error) {
            console.log('[BRAIN] ⚠️ Failed to sync brain config');
        }
    }
    
    startSync() {
        this.syncTimer = setInterval(async () => {
            await this.syncBrainConfig();
            await this.sendOptimizerDataToBrain();
        }, this.syncInterval);
    }
    
    async sendOptimizerDataToBrain() {
        if (!this.isConnected) return;
        
        try {
            const RankingEngine = require('./RankingEngine');
            const AIAutoOptimizer = require('./AIAutoOptimizer');
            
            const optimizerState = AIAutoOptimizer.getState();
            const rankings = RankingEngine.getRankingReport();
            
            await axios.post(`${this.brainUrl}/api/oracle/update`, {
                rankings: rankings,
                optimizer: optimizerState,
                timestamp: Date.now()
            }, { timeout: 5000 });
            
            console.log('[BRAIN] 📤 Sent optimizer data to Brain');
        } catch (error) {
            // Silently fail - brain may not be available
        }
    }
    
    async requestOptimization() {
        if (!this.isConnected) return null;
        
        try {
            const response = await axios.post(
                `${this.brainUrl}/api/oracle/optimize`,
                {
                    rankings: require('./RankingEngine').getRankingReport(),
                    currentConfig: require('../../configService').getConfig()
                },
                { timeout: 10000 }
            );
            
            return response.data;
        } catch (error) {
            console.log('[BRAIN] ⚠️ Optimization request failed');
            return null;
        }
    }
    
    async getTheoreticalMaximum() {
        if (!this.isConnected) return null;
        
        try {
            const response = await axios.get(
                `${this.brainUrl}/api/oracle/theoretical-max`,
                { timeout: 10000 }
            );
            
            return response.data;
        } catch (error) {
            return null;
        }
    }
    
    async detectMarketRegime() {
        if (!this.isConnected) return 'NORMAL';
        
        try {
            const response = await axios.get(
                `${this.brainUrl}/api/oracle/regime`,
                { timeout: 5000 }
            );
            
            return response.data.regime || 'NORMAL';
        } catch (error) {
            return 'NORMAL';
        }
    }
    
    // Get unified status
    async getUnifiedStatus() {
        const RankingEngine = require('./RankingEngine');
        const AIAutoOptimizer = require('./AIAutoOptimizer');
        
        const status = {
            brain: {
                connected: this.isConnected,
                lastUpdate: this.lastBrainUpdate
            },
            ranking: RankingEngine.getRankingReport(),
            optimizer: AIAutoOptimizer.getState(),
            unifiedRecommendations: []
        };
        
        // Get brain recommendations if connected
        if (this.isConnected) {
            try {
                const brainRec = await axios.get(
                    `${this.brainUrl}/api/oracle/recommendations`,
                    { timeout: 5000 }
                );
                status.unifiedRecommendations = brainRec.data.recommendations || [];
            } catch (e) {
                // Use optimizer recommendations
                status.unifiedRecommendations = AIAutoOptimizer.getState().recentDecisions || [];
            }
        }
        
        return status;
    }
    
    stop() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
    }
}

module.exports = new BrainConnector();
