/**
 * AlphaPro Configuration Service
 * Centralized configuration management for the trading engine
 */

const EventEmitter = require('events');
const path = require('path');

// Load data sources configuration
const dataSources = require('../data_sources.json');

class ConfigService extends EventEmitter {
    constructor() {
        super();
        
        // Default configuration
        this.config = {
            // Trading Configuration
            maxConcurrentExecutions: parseInt(process.env.MAX_CONCURRENT_EXECUTIONS) || 5,
            minOpportunitySize: parseFloat(process.env.MIN_OPPORTUNITY_SIZE) || 100,
            
            // Risk Management
            maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE) || 10000,
            stopLossPercentage: parseFloat(process.env.STOP_LOSS_PERCENTAGE) || 5,
            
            // Data Sources
            dataSources: dataSources,
            
            // API Keys (from environment)
            alchemyApiKey: process.env.ALCHEMY_API_KEY,
            infuraApiKey: process.env.INFURA_API_KEY,
            
            // Blockchain
            rpcUrls: {
                ethereum: process.env.ETH_RPC_URL,
                polygon: process.env.POLYGON_RPC_URL,
                arbitrum: process.env.ARBITRUM_RPC_URL,
                optimism: process.env.OPTIMISM_RPC_URL
            },
            
            // Wallet
            walletAddress: process.env.WALLET_ADDRESS
        };
        
        console.log('[CONFIG] Configuration service initialized');
   }
    
    getConfig() {
        return this.config;
    }
    
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.emit('config_update', this.config);
    }
}

const instance = new ConfigService();
module.exports = instance;
