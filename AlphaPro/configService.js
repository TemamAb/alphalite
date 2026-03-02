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
    // Debug: Log what we're looking for
    console.log(`[CONFIG] getConfigValue: primaryKey=${primaryKey}, fallbackKeys=${JSON.stringify(fallbackKeys)}`);
    
    // First priority: Render's process.env (set in Render dashboard)
    if (process.env[primaryKey]) {
        console.log(`[CONFIG] Found primary key '${primaryKey}': ${process.env[primaryKey].substring(0, 10)}...`);
        return process.env[primaryKey];
    }
    
    // Second priority: fallback keys from .env file
    for (const key of fallbackKeys) {
        if (process.env[key]) {
            console.log(`[CONFIG] Found fallback key '${key}': ${process.env[key].substring(0, 10)}...`);
            return process.env[key];
        }
    }
    
    console.log(`[CONFIG] Key '${primaryKey}' not found, returning default: ${defaultValue}`);
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
            
            // Blockchain RPC URLs - 55+ Networks Supported
            rpcUrls: {
                // EVM Chains (Alchemy)
                ethereum: getConfigValue('ETH_RPC_URL', ['ETH_RPC_URL', 'ethereum_rpc', 'ETHRPC'], null),
                polygon: getConfigValue('POLYGON_RPC_URL', ['POLYGON_RPC_URL', 'polygon_rpc'], null),
                arbitrum: getConfigValue('ARBITRUM_RPC_URL', ['ARBITRUM_RPC_URL', 'arbitrum_rpc'], null),
                optimism: getConfigValue('OPTIMISM_RPC_URL', ['OPTIMISM_RPC_URL', 'optimism_rpc'], null),
                base: getConfigValue('BASE_RPC_URL', ['BASE_RPC_URL', 'base_rpc'], null),
                avalanche: getConfigValue('AVALANCHE_RPC_URL', ['AVALANCHE_RPC_URL', 'avax_rpc'], null),
                bsc: getConfigValue('BSC_RPC_URL', ['BSC_RPC_URL', 'bnb_rpc'], null),
                celo: getConfigValue('CELO_RPC_URL', ['CELO_RPC_URL', 'celo_rpc'], null),
                arbitrumNova: getConfigValue('ARBITRUM_NOVA_RPC_URL', ['ARBITRUM_NOVA_RPC_URL'], null),
                polygonZkevm: getConfigValue('POLYGON_ZKEVM_RPC_URL', ['POLYGON_ZKEVM_RPC_URL', 'zkevm_rpc'], null),
                scroll: getConfigValue('SCROLL_RPC_URL', ['SCROLL_RPC_URL'], null),
                zora: getConfigValue('ZORA_RPC_URL', ['ZORA_RPC_URL'], null),
                
                // Testnets
                sepolia: getConfigValue('SEPOLIA_RPC_URL', ['SEPOLIA_RPC_URL'], null),
                goerli: getConfigValue('GOERLI_RPC_URL', ['GOERLI_RPC_URL'], null),
                arbitrumSepolia: getConfigValue('ARBITRUM_SEPOLIA_RPC_URL', ['ARBITRUM_SEPOLIA_RPC_URL'], null),
                optimismSepolia: getConfigValue('OPTIMISM_SEPOLIA_RPC_URL', ['OPTIMISM_SEPOLIA_RPC_URL'], null),
                baseSepolia: getConfigValue('BASE_SEPOLIA_RPC_URL', ['BASE_SEPOLIA_RPC_URL'], null),
                
                // Non-EVM
                solana: getConfigValue('SOLANA_RPC_URL', ['SOLANA_RPC_URL'], null),
                starknet: getConfigValue('STARKNET_RPC_URL', ['STARKNET_RPC_URL'], null),
                apts: getConfigValue('APTOS_RPC_URL', ['APTOS_RPC_URL'], null),
                
                // Additional EVM Chains
                fantom: getConfigValue('FANTOM_RPC_URL', ['FANTOM_RPC_URL', 'ftm_rpc'], null),
                cronos: getConfigValue('CRONOS_RPC_URL', ['CRONOS_RPC_URL'], null),
                gnosis: getConfigValue('GNOSIS_RPC_URL', ['GNOSIS_RPC_URL'], null),
                kava: getConfigValue('KAVA_RPC_URL', ['KAVA_RPC_URL'], null),
                moonbeam: getConfigValue('MOONBEAM_RPC_URL', ['MOONBEAM_RPC_URL'], null),
                astar: getConfigValue('ASTAR_RPC_URL', ['ASTAR_RPC_URL'], null),
                moonriver: getConfigValue('MOONRIVER_RPC_URL', ['MOONRIVER_RPC_URL'], null),
                evmos: getConfigValue('EVMOS_RPC_URL', ['EVMOS_RPC_URL'], null),
                canto: getConfigValue('CANTO_RPC_URL', ['CANTO_RPC_URL'], null),
                aurora: getConfigValue('AURORA_RPC_URL', ['AURORA_RPC_URL'], null),
                tenet: getConfigValue('TENET_RPC_URL', ['TENET_RPC_URL'], null),
                optyfi: getConfigValue('OPTYFI_RPC_URL', ['OPTYFI_RPC_URL'], null),
                mantle: getConfigValue('MANTLE_RPC_URL', ['MANTLE_RPC_URL'], null),
                berachain: getConfigValue('BERACHAIN_RPC_URL', ['BERACHAIN_RPC_URL'], null),
                linea: getConfigValue('LINEA_RPC_URL', ['LINEA_RPC_URL'], null),
                mode: getConfigValue('MODE_RPC_URL', ['MODE_RPC_URL'], null),
                fraxtal: getConfigValue('FRAXTAL_RPC_URL', ['FRAXTAL_RPC_URL'], null),
                blast: getConfigValue('BLAST_RPC_URL', ['BLAST_RPC_URL'], null),
                rootstock: getConfigValue('ROOTSTOCK_RPC_URL', ['ROOTSTOCK_RPC_URL', 'rsk_rpc'], null),
                rsk: getConfigValue('RSK_RPC_URL', ['RSK_RPC_URL'], null),
                
                // Cosmos Ecosystem
                cosmos: getConfigValue('COSMOS_RPC_URL', ['COSMOS_RPC_URL'], null),
                osmosis: getConfigValue('OSMOSIS_RPC_URL', ['OSMOSIS_RPC_URL'], null),
                injective: getConfigValue('INJECTIVE_RPC_URL', ['INJECTIVE_RPC_URL'], null),
                sei: getConfigValue('SEI_RPC_URL', ['SEI_RPC_URL'], null),
                
                // Other Chains
                sui: getConfigValue('SUI_RPC_URL', ['SUI_RPC_URL'], null),
                near: getConfigValue('NEAR_RPC_URL', ['NEAR_RPC_URL'], null),
                algorand: getConfigValue('ALGORAND_RPC_URL', ['ALGORAND_RPC_URL'], null),
                hedera: getConfigValue('HEDERA_RPC_URL', ['HEDERA_RPC_URL'], null),
                tezos: getConfigValue('TEZOS_RPC_URL', ['TEZOS_RPC_URL'], null),
                vechain: getConfigValue('VECHAIN_RPC_URL', ['VECHAIN_RPC_URL'], null),
                thorchain: getConfigValue('THORCHAIN_RPC_URL', ['THORCHAIN_RPC_URL'], null),
                xrpl: getConfigValue('XRPL_RPC_URL', ['XRPL_RPC_URL', 'ripple_rpc'], null),
                dogecoin: getConfigValue('DOGECOIN_RPC_URL', ['DOGECOIN_RPC_URL', 'doge_rpc'], null),
                litecoin: getConfigValue('LITECOIN_RPC_URL', ['LITECOIN_RPC_URL', 'ltc_rpc'], null),
                bitcoincsv: getConfigValue('BITCOIN_SV_RPC_URL', ['BITCOIN_SV_RPC_URL', 'bsv_rpc'], null),
                kadena: getConfigValue('KADENA_RPC_URL', ['KADENA_RPC_URL'], null),
            },
            
            // WebSocket URLs for mempool - 40+ Networks
            wsUrls: {
                // EVM Chains (Alchemy)
                ethereum: getConfigValue('ETH_WS_URL', ['ALCHEMY_WS_URL', 'eth_ws_url'], null),
                polygon: getConfigValue('POLYGON_WS_URL', ['polygon_ws_url'], null),
                arbitrum: getConfigValue('ARBITRUM_WS_URL', ['arbitrum_ws_url'], null),
                optimism: getConfigValue('OPTIMISM_WS_URL', ['optimism_ws_url'], null),
                base: getConfigValue('BASE_WS_URL', ['base_ws_url'], null),
                avalanche: getConfigValue('AVALANCHE_WS_URL', ['avax_ws_url'], null),
                bsc: getConfigValue('BSC_WS_URL', ['bnb_ws_url'], null),
                celo: getConfigValue('CELO_WS_URL', ['celo_ws_url'], null),
                arbitrumNova: getConfigValue('ARBITRUM_NOVA_WS_URL', [], null),
                polygonZkevm: getConfigValue('POLYGON_ZKEVM_WS_URL', [], null),
                scroll: getConfigValue('SCROLL_WS_URL', [], null),
                zora: getConfigValue('ZORA_WS_URL', [], null),
                
                // Testnets
                sepolia: getConfigValue('SEPOLIA_WS_URL', [], null),
                goerli: getConfigValue('GOERLI_WS_URL', [], null),
                arbitrumSepolia: getConfigValue('ARBITRUM_SEPOLIA_WS_URL', [], null),
                optimismSepolia: getConfigValue('OPTIMISM_SEPOLIA_WS_URL', [], null),
                baseSepolia: getConfigValue('BASE_SEPOLIA_WS_URL', [], null),
                
                // Additional EVM
                fantom: getConfigValue('FANTOM_WS_URL', ['ftm_ws_url'], null),
                cronos: getConfigValue('CRONOS_WS_URL', [], null),
                gnosis: getConfigValue('GNOSIS_WS_URL', [], null),
                kava: getConfigValue('KAVA_WS_URL', [], null),
                moonbeam: getConfigValue('MOONBEAM_WS_URL', [], null),
                astar: getConfigValue('ASTAR_WS_URL', [], null),
                moonriver: getConfigValue('MOONRIVER_WS_URL', [], null),
                evmos: getConfigValue('EVMOS_WS_URL', [], null),
                canto: getConfigValue('CANTO_WS_URL', [], null),
                aurora: getConfigValue('AURORA_WS_URL', [], null),
                tenet: getConfigValue('TENET_WS_URL', [], null),
                optyfi: getConfigValue('OPTYFI_WS_URL', [], null),
                mantle: getConfigValue('MANTLE_WS_URL', [], null),
                linea: getConfigValue('LINEA_WS_URL', [], null),
                mode: getConfigValue('MODE_WS_URL', [], null),
                fraxtal: getConfigValue('FRAXTAL_WS_URL', [], null),
                blast: getConfigValue('BLAST_WS_URL', [], null),
                rootstock: getConfigValue('ROOTSTOCK_WS_URL', [], null),
                
                // Cosmos Ecosystem
                cosmos: getConfigValue('COSMOS_WS_URL', [], null),
                osmosis: getConfigValue('OSMOSIS_WS_URL', [], null),
                injective: getConfigValue('INJECTIVE_WS_URL', [], null),
                sei: getConfigValue('SEI_WS_URL', [], null),
                
                // Other Chains
                vechain: getConfigValue('VECHAIN_WS_URL', [], null),
                thorchain: getConfigValue('THORCHAIN_WS_URL', [], null),
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
                coingeckoUrl: getConfigValue('COINGECKO_API_URL', ['coingecko_api_url', 'coingecko_url', 'COINGECKO_URL'], 'https://api.coingecko.com/api/v3'),
                dexscreenerUrl: getConfigValue('DEXSCREENER_API_URL', ['dexscreener_api_url', 'DEXSCREENER_URL', 'DEXSCREENER_API'], 'https://api.dexscreener.com/latest/dex'),
                birdeyeUrl: getConfigValue('BIRDEYE_API_URL', ['birdeye_api_url', 'BIRDEYE_URL', 'BIRDEYE_API'], 'https://public-api.birdeye.so'),
            },
            
            // Market Data API Keys
            marketApiKeys: {
                coingecko: getConfigValue('COINGECKO_API_KEY', ['coingecko_key'], null),
                birdeye: getConfigValue('BIRDEYE_API_KEY', ['birdeye_key'], null),
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
            { name: 'Coingecko', value: this.config.marketData.coingeckoUrl ? 'configured' : 'MISSING' },
            { name: 'DexScreener', value: this.config.marketData.dexscreenerUrl ? 'configured' : 'MISSING' },
            { name: 'Birdeye', value: this.config.marketData.birdeyeUrl ? 'configured' : 'MISSING' },
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
