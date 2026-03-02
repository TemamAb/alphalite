/**
 * AlphaPro Configuration Service
 * Centralized configuration management for the trading engine
 * Supports Render environment variables with .env file fallback
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

// Load data sources configuration
const dataSources = require('./data_sources.json');

// Try to load dotenv for .env file fallback
let dotenv;
try {
    dotenv = require('dotenv');
    // Try multiple paths for .env file
    const possiblePaths = [
        path.join(__dirname, '.env'),
        path.join(__dirname, '..', '.env'),
        path.join(process.cwd(), '.env')
    ];
    
    for (const envPath of possiblePaths) {
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
            console.log('[CONFIG] Loaded .env file from:', envPath);
            break;
        }
    }
} catch (e) {
    console.log('[CONFIG] dotenv not available, using process.env only');
}

/**
 * Get configuration value with Render-first (process.env), .env-second fallback
 * This allows: Render dashboard env vars > local .env file
 */
function getConfigValue(primaryKey, fallbackKeys = [], defaultValue = null) {
    // First priority: Render's process.env (set in Render dashboard)
    if (process.env[primaryKey]) {
        return process.env[primaryKey];
    }
    
    // Second priority: fallback keys from .env file
    for (const key of fallbackKeys) {
        if (process.env[key]) {
            return process.env[key];
        }
    }
    
    // Third priority: default value
    return defaultValue;
}

/**
 * Get numeric config value
 */
function getNumericValue(primaryKey, fallbackKeys = [], defaultValue = null) {
    const value = getConfigValue(primaryKey, fallbackKeys, defaultValue);
    return value ? parseFloat(value) : defaultValue;
}

/**
 * Get integer config value
 */
function getIntValue(primaryKey, fallbackKeys = [], defaultValue = null) {
    const value = getConfigValue(primaryKey, fallbackKeys, defaultValue);
    return value ? parseInt(value) : defaultValue;
}

class ConfigService extends EventEmitter {
    constructor() {
        super();
        
        // Default configuration with fallback logic
        this.config = {
            // Trading Configuration
            maxConcurrentExecutions: getIntValue('MAX_CONCURRENT_EXECUTIONS', ['max_concurrent_executions'], 5),
            minOpportunitySize: getNumericValue('MIN_OPPORTUNITY_SIZE', ['min_opportunity_size'], 100),
            
            // Risk Management
            maxPositionSize: getNumericValue('MAX_POSITION_SIZE', ['max_position_size'], 10000),
            stopLossPercentage: getNumericValue('STOP_LOSS_PERCENTAGE', ['stop_loss_percentage'], 5),
            
            // Trading Mode
            tradingMode: getConfigValue('TRADING_MODE', ['trading_mode'], 'LIVE'),
            withdrawalMode: getConfigValue('WITHDRAWAL_MODE', ['withdrawal_mode'], 'MANUAL'),
            
            // Data Sources
            dataSources: dataSources,
            
            // API Keys - Render first, .env fallback
            // Also extract from WebSocket URLs if embedded
            alchemyApiKey: getConfigValue('ALCHEMY_API_KEY', 
                ['ALCHEMY-API-KEY', 'ALCHEMY-API-KEY', 'alchemy_api_key', 'ALCHEMY_KEY'], 
                this.extractAlchemyKey(
                    getConfigValue('ETH_WS_URL', ['eth_ws_url'], null) ||
                    getConfigValue('ALCHEMY_WS_URL', ['alchemy_ws_url'], null) ||
                    getConfigValue('ALCHEMY_WS', ['alchemy_ws'], null)
                )
            ),
            infuraApiKey: getConfigValue('INFURA_API_KEY', ['infura_api_key', 'INFURA_API_KEY'], null),
            pimlicoApiKey: getConfigValue('PIMLICO_API_KEY', ['pimlico_api_key'], null),
            openaiApiKey: getConfigValue('OPENAI_API_KEY', ['openai_api_key'], null),
            
            // Blockchain RPC URLs - Check multiple variations from .env
            rpcUrls: {
                ethereum: getConfigValue('ETHEREUM_RPC', 
                    ['ETH_RPC_URL', 'ethereum_rpc', 'eth_rpc_url', 'ETHRPC'], null),
                polygon: getConfigValue('POLYGON_RPC', 
                    ['POLYGON_RPC_URL', 'polygon_rpc', 'polygon_rpc_url'], null),
                arbitrum: getConfigValue('ARBITRUM_RPC', 
                    ['ARBITRUM_RPC_URL', 'arbitrum_rpc', 'arbitrum_rpc_url'], null),
                optimism: getConfigValue('OPTIMISM_RPC', 
                    ['OPTIMISM_RPC_URL', 'optimism_rpc', 'optimism_rpc_url'], null),
                base: getConfigValue('BASE_RPC', 
                    ['BASE_RPC_URL', 'base_rpc', 'base_rpc_url'], null),
            },
            
            // WebSocket URLs for mempool - Critical for live data
            wsUrls: {
                ethereum: getConfigValue('ETH_WS_URL', 
                    ['ALCHEMY_WS_URL', 'eth_ws_url', 'alchemy_ws_url', 'ALCHEMY_WS'], null),
                polygon: getConfigValue('POLYGON_WS_URL', 
                    ['polygon_ws_url', 'POLYGON_WS'], null),
                arbitrum: getConfigValue('ARBITRUM_WS_URL', 
                    ['arbitrum_ws_url', 'ARBITRUM_WS'], null),
                optimism: getConfigValue('OPTIMISM_WS_URL', 
                    ['optimism_ws_url', 'OPTIMISM_WS'], null),
                base: getConfigValue('BASE_WS_URL', 
                    ['base_ws_url', 'BASE_WS'], null),
            },
            
            // Pimlico Configuration
            pimlico: {
                bundlerUrl: getConfigValue('BUNDLER_URL', ['bundler_url'], null),
                paymasterUrl: getConfigValue('PAYMASTER_URL', ['paymaster_url'], null),
                entryPoint: getConfigValue('ENTRYPOINT_ADDRESS', ['entrypoint_address'], '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'),
            },
            
            // Wallet Configuration
            walletAddress: getConfigValue('WALLET_ADDRESS', ['wallet_address'], null),
            privateKey: getConfigValue('PRIVATE_KEY', ['private_key'], null),
            
            // Market Data APIs
            marketData: {
                coingeckoUrl: getConfigValue('COINGECKO_API_URL', ['coingecko_api_url', 'coingecko_url'], 'https://api.coingecko.com/api/v3'),
                dexscreenerUrl: getConfigValue('DEXSCREENER_API_URL', ['dexscreener_api_url'], 'https://api.dexscreener.com/latest/dex'),
                birdeyeUrl: getConfigValue('BIRDEYE_API_URL', ['birdeye_api_url'], 'https://public-api.birdeye.so'),
            }
        };
        
        console.log('[CONFIG] Configuration service initialized');
        this.logConfigStatus();
    }
    
    /**
     * Extract Alchemy API key from WebSocket URL if embedded
     * e.g., wss://eth-mainnet.g.alchemy.com/v2/KEY123 -> KEY123
     */
    extractAlchemyKey(wsUrl) {
        if (!wsUrl) return null;
        const match = wsUrl.match(/\/v2\/(.+)$/);
        return match ? match[1] : null;
    }
    
    logConfigStatus() {
        console.log('[CONFIG] === Configuration Status ===');
        
        // Check critical configurations
        const critical = [
            { name: 'Trading Mode', value: this.config.tradingMode },
            { name: 'Wallet Address', value: this.config.walletAddress ? this.config.walletAddress.substring(0, 10) + '...' : 'MISSING' },
            { name: 'Pimlico API', value: this.config.pimlicoApiKey ? 'configured' : 'MISSING' },
            { name: 'Alchemy API', value: this.config.alchemyApiKey ? 'configured' : 'MISSING' },
            { name: 'ETH RPC', value: this.config.rpcUrls.ethereum ? 'configured' : 'MISSING' },
            { name: 'WebSocket ETH', value: this.config.wsUrls.ethereum ? 'configured' : 'MISSING' },
        ];
        
        critical.forEach(item => {
            console.log(`[CONFIG]   ${item.name}: ${item.value}`);
        });
        console.log('[CONFIG] ==============================');
    }
    
    getConfig() {
        return this.config;
    }
    
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.emit('config_update', this.config);
    }
    
    /**
     * Get specific config value
     */
    get(key) {
        return this.config[key];
    }
}

const instance = new ConfigService();
module.exports = instance;
