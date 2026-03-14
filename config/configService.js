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
    // Define potential paths for the .env file, from most to least specific.
    // This covers local execution, Docker execution, and different CWDs.
    const possiblePaths = [
        path.resolve(process.cwd(), '.env'),          // Project root (standard)
        path.resolve(__dirname, '..', '.env'),        // Relative to this file
        '/usr/src/app/.env'                           // Docker container path
    ];

    let envPathFound = null;
    for (const envPath of possiblePaths) {
        if (fs.existsSync(envPath)) {
            envPathFound = envPath;
            break;
        }
    }

    if (envPathFound) {
        // Use override: true to ensure .env values take precedence over system env vars.
        // This is critical for ensuring the correct private key is used.
        dotenv.config({ path: envPathFound, override: true });
        console.log(`[CONFIG] ✅ Loaded and prioritized .env file from: ${envPathFound}`);
    } else {
        console.log('[CONFIG] ⚠️ No .env file found. Relying on system environment variables.');
    }
} catch (e) {
    console.log('[CONFIG] dotenv not available, relying on system environment variables only.');
}

class ConfigService extends EventEmitter {
    constructor() {
        super();

        // Helper functions to get values from process.env with fallbacks and type casting
        const getConfigValue = (key, fallbacks = [], def = null) => {
            const keys = [key, ...fallbacks];
            for (const k of keys) {
                if (process.env[k]) return process.env[k];
            }
            return def;
        };
        const getNumericValue = (key, fallbacks = [], def = null) => {
            const val = getConfigValue(key, fallbacks, def);
            return val ? parseFloat(val) : def;
        };
        const getIntValue = (key, fallbacks = [], def = null) => {
            const val = getConfigValue(key, fallbacks, def);
            return val ? parseInt(val) : def;
        };

        // Get wallet configs first for auto-LIVE mode detection
        const privateKey = process.env.PRIVATE_KEY || null;
        const walletAddress = process.env.WALLET_ADDRESS || null;
        
        // Get trading mode - default to PAPER, auto-switch to LIVE if private key available
        let tradingMode = process.env.TRADING_MODE || 'PAPER';
        if (privateKey && walletAddress && tradingMode === 'PAPER') {
            console.log('[CONFIG] ⚠️ PRIVATE_KEY detected - auto-switching to LIVE trading mode');
            tradingMode = 'LIVE';
        }

        // Default configuration with fallback logic
        this.config = {
            // Trading Configuration
            maxConcurrentExecutions: getIntValue('MAX_CONCURRENT_EXECUTIONS', [], 5),
            minOpportunitySize: getNumericValue('MIN_OPPORTUNITY_SIZE', [], 100),

            // Risk Management
            maxPositionSize: getNumericValue('MAX_POSITION_SIZE', [], 10000),
            stopLossPercentage: getNumericValue('STOP_LOSS_PERCENTAGE', [], 5),

            // Trading Mode
            tradingMode: tradingMode,
            withdrawalMode: getConfigValue('WITHDRAWAL_MODE', ['withdrawal_mode'], 'MANUAL'),

            // Data Sources
            dataSources: dataSources,

            // API Keys - Render first, .env fallback
            // Also extract from WebSocket URLs if embedded
            alchemyApiKey: getConfigValue('ALCHEMY_API_KEY', [],
                this.extractAlchemyKey(
                    getConfigValue('ETH_WS_URL', [], null) ||
                    getConfigValue('ALCHEMY_WS_URL', [], null) ||
                    getConfigValue('ALCHEMY_WS', [], null)
                )
            ),
            infuraApiKey: getConfigValue('INFURA_API_KEY', [], null),
            pimlicoApiKey: getConfigValue('PIMLICO_API_KEY', [], null),
            openaiApiKey: getConfigValue('OPENAI_API_KEY', [], null),

            // Blockchain RPC URLs - 55+ Networks Supported (with public fallbacks)
            rpcUrls: {
                // EVM Chains (Alchemy)
                ethereum: getConfigValue('ETH_RPC_URL', ['ETH_RPC_URL', 'ethereum_rpc', 'ETHRPC'], 'https://cloudflare-eth.com'),
                polygon: getConfigValue('POLYGON_RPC_URL', ['POLYGON_RPC_URL', 'polygon_rpc'], 'https://polygon.llamarpc.com'),
                arbitrum: getConfigValue('ARBITRUM_RPC_URL', ['ARBITRUM_RPC_URL', 'arbitrum_rpc'], 'https://arb1.arbitrum.io/rpc'),
                optimism: getConfigValue('OPTIMISM_RPC_URL', ['OPTIMISM_RPC_URL', 'optimism_rpc'], 'https://mainnet.optimism.io'),
                base: getConfigValue('BASE_RPC_URL', ['BASE_RPC_URL', 'base_rpc'], 'https://base.llamarpc.com'),
                avalanche: getConfigValue('AVALANCHE_RPC_URL', ['AVALANCHE_RPC_URL', 'avax_rpc'], 'https://api.avax.network/ext/bc/C/rpc'),
                bsc: getConfigValue('BSC_RPC_URL', ['BSC_RPC_URL', 'bnb_rpc'], 'https://bsc-dataseed.binance.org'),
                celo: getConfigValue('CELO_RPC_URL', ['CELO_RPC_URL', 'celo_rpc'], 'https://forno.celo.org'),
                arbitrumNova: getConfigValue('ARBITRUM_NOVA_RPC_URL', ['ARBITRUM_NOVA_RPC_URL'], 'https://nova.arbitrum.io/rpc'),
                polygonZkevm: getConfigValue('POLYGON_ZKEVM_RPC_URL', ['POLYGON_ZKEVM_RPC_URL', 'zkevm_rpc'], 'https://zkevm-rpc.com'),
                scroll: getConfigValue('SCROLL_RPC_URL', ['SCROLL_RPC_URL'], 'https://rpc.scroll.io'),
                zora: getConfigValue('ZORA_RPC_URL', ['ZORA_RPC_URL'], 'https://rpc.zora.energy'),

                // Testnets
                sepolia: getConfigValue('SEPOLIA_RPC_URL', ['SEPOLIA_RPC_URL'], 'https://rpc.sepolia.org'),
                goerli: getConfigValue('GOERLI_RPC_URL', ['GOERLI_RPC_URL'], 'https://goerli.infura.io/v3/'),
                arbitrumSepolia: getConfigValue('ARBITRUM_SEPOLIA_RPC_URL', ['ARBITRUM_SEPOLIA_RPC_URL'], 'https://sepolia.arbitrum.io/rpc'),
                optimismSepolia: getConfigValue('OPTIMISM_SEPOLIA_RPC_URL', ['OPTIMISM_SEPOLIA_RPC_URL'], 'https://sepolia.optimism.io'),
                baseSepolia: getConfigValue('BASE_SEPOLIA_RPC_URL', ['BASE_SEPOLIA_RPC_URL'], 'https://sepolia.base.org'),

                // Non-EVM
                solana: getConfigValue('SOLANA_RPC_URL', ['SOLANA_RPC_URL'], 'https://api.mainnet-beta.solana.com'),
                starknet: getConfigValue('STARKNET_RPC_URL', ['STARKNET_RPC_URL'], 'https://rpc-mainnet.starknet.io'),
                apts: getConfigValue('APTOS_RPC_URL', ['APTOS_RPC_URL'], 'https://fullnode.mainnet.aptoslabs.com'),

                // Additional EVM Chains
                fantom: getConfigValue('FANTOM_RPC_URL', ['FANTOM_RPC_URL', 'ftm_rpc'], 'https://rpc.fantom.network'),
                cronos: getConfigValue('CRONOS_RPC_URL', ['CRONOS_RPC_URL'], 'https://rpc.cronos.org'),
                gnosis: getConfigValue('GNOSIS_RPC_URL', ['GNOSIS_RPC_URL'], 'https://rpc.gnosischain.com'),
                kava: getConfigValue('KAVA_RPC_URL', ['KAVA_RPC_URL'], 'https://evm.kava.io'),
                moonbeam: getConfigValue('MOONBEAM_RPC_URL', ['MOONBEAM_RPC_URL'], 'https://rpc.api.moonbeam.network'),
                astar: getConfigValue('ASTAR_RPC_URL', ['ASTAR_RPC_URL'], 'https://rpc.astar.network'),
                moonriver: getConfigValue('MOONRIVER_RPC_URL', ['MOONRIVER_RPC_URL'], 'https://rpc.moonriver.moonbeam.network'),
                evmos: getConfigValue('EVMOS_RPC_URL', ['EVMOS_RPC_URL'], 'https://evmos-rpc.theams.info'),
                canto: getConfigValue('CANTO_RPC_URL', ['CANTO_RPC_URL'], 'https://canto.evm.bronbro.io'),
                aurora: getConfigValue('AURORA_RPC_URL', ['AURORA_RPC_URL'], 'https://mainnet.aurora.dev'),
                tenet: getConfigValue('TENET_RPC_URL', ['TENET_RPC_URL'], 'https://rpc.tenet.org'),
                optyfi: getConfigValue('OPTYFI_RPC_URL', ['OPTYFI_RPC_URL'], 'https://mainnet.opty.fi'),
                mantle: getConfigValue('MANTLE_RPC_URL', ['MANTLE_RPC_URL'], 'https://rpc.mantle.xyz'),
                berachain: getConfigValue('BERACHAIN_RPC_URL', ['BERACHAIN_RPC_URL'], 'https://rpc.berachain.com'),
                linea: getConfigValue('LINEA_RPC_URL', ['LINEA_RPC_URL'], 'https://rpc.linea.build'),
                mode: getConfigValue('MODE_RPC_URL', ['MODE_RPC_URL'], 'https://mainnet.mode.network'),
                fraxtal: getConfigValue('FRAXTAL_RPC_URL', ['FRAXTAL_RPC_URL'], 'https://rpc.frax.com'),
                blast: getConfigValue('BLAST_RPC_URL', ['BLAST_RPC_URL'], 'https://rpc.blast.io'),
                rootstock: getConfigValue('ROOTSTOCK_RPC_URL', ['ROOTSTOCK_RPC_URL', 'rsk_rpc'], 'https://public-node.rsk.co'),
                rsk: getConfigValue('RSK_RPC_URL', ['RSK_RPC_URL'], 'https://public-node.rsk.co'),

                // Cosmos Ecosystem
                cosmos: getConfigValue('COSMOS_RPC_URL', ['COSMOS_RPC_URL'], 'https://rpc-cosmoshub.keplr.app'),
                osmosis: getConfigValue('OSMOSIS_RPC_URL', ['OSMOSIS_RPC_URL'], 'https://rpc-osmosis.keplr.app'),
                injective: getConfigValue('INJECTIVE_RPC_URL', ['INJECTIVE_RPC_URL'], 'https://public.injective.network'),
                sei: getConfigValue('SEI_RPC_URL', ['SEI_RPC_URL'], 'https://rpc.sei.io'),

                // Other Chains
                sui: getConfigValue('SUI_RPC_URL', ['SUI_RPC_URL'], 'https://rpc.mainnet.sui.io'),
                near: getConfigValue('NEAR_RPC_URL', ['NEAR_RPC_URL'], 'https://rpc.mainnet.near.org'),
                algorand: getConfigValue('ALGORAND_RPC_URL', ['ALGORAND_RPC_URL'], 'https://mainnet-api.algorand.org'),
                hedera: getConfigValue('HEDERA_RPC_URL', ['HEDERA_RPC_URL'], 'https://mainnet.hashio.io'),
                tezos: getConfigValue('TEZOS_RPC_URL', ['TEZOS_RPC_URL'], 'https://mainnet.api.tez.ie'),
                vechain: getConfigValue('VECHAIN_RPC_URL', ['VECHAIN_RPC_URL'], 'https://mainnet.vechain.energy'),
                thorchain: getConfigValue('THORCHAIN_RPC_URL', ['THORCHAIN_RPC_URL'], 'https://rpc.thorchain.info'),
                xrpl: getConfigValue('XRPL_RPC_URL', ['XRPL_RPC_URL', 'ripple_rpc'], 'https://xrplcluster.org'),
                dogecoin: getConfigValue('DOGECOIN_RPC_URL', ['DOGECOIN_RPC_URL', 'doge_rpc'], 'https://rpc.dogecoin.com'),
                litecoin: getConfigValue('LITECOIN_RPC_URL', ['LITECOIN_RPC_URL', 'ltc_rpc'], 'https://rpc.litecoin.com'),
                bitcoincsv: getConfigValue('BITCOIN_SV_RPC_URL', ['BITCOIN_SV_RPC_URL', 'bsv_rpc'], 'https://bitcoinsv.io'),
                kadena: getConfigValue('KADENA_RPC_URL', ['KADENA_RPC_URL'], 'https://api.kadena.network'),
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

                // Additional EVM Chains
                fantom: getConfigValue('FANTOM_WS_URL', [], null),
                cronos: getConfigValue('CRONOS_WS_URL', [], null),
                gnosis: getConfigValue('GNOSIS_WS_URL', [], null),
                kava: getConfigValue('KAVA_WS_URL', [], null),
                moonbeam: getConfigValue('MOONBEAM_WS_URL', [], null),
                astar: getConfigValue('ASTAR_WS_URL', [], null),
                moonriver: getConfigValue('MOONRIVER_WS_URL', [], null),
                evmos: getConfigValue('EVMOS_WS_URL', [], null),
                canto: getConfigValue('CANTO_WS_URL', [], null),
                aurora: getConfigValue('AURORA_WS_URL', [], null),
                mantle: getConfigValue('MANTLE_WS_URL', [], null),
                linea: getConfigValue('LINEA_WS_URL', [], null),
                mode: getConfigValue('MODE_WS_URL', [], null),
                blast: getConfigValue('BLAST_WS_URL', [], null),
                rootstock: getConfigValue('ROOTSTOCK_WS_URL', [], null),

                // Cosmos Ecosystem
                cosmos: getConfigValue('COSMOS_WS_URL', [], null),
                osmosis: getConfigValue('OSMOSIS_WS_URL', [], null),
                injective: getConfigValue('INJECTIVE_WS_URL', [], null),
                sei: getConfigValue('SEI_WS_URL', [], null),
                vechain: getConfigValue('VECHAIN_WS_URL', [], null),
                thorchain: getConfigValue('THORCHAIN_WS_URL', [], null),
            },

            // Account Abstraction (Pimlico)
            pimlico: { // This structure is kept for compatibility with EnterpriseProfitEngine
                bundlerUrl: getConfigValue('BUNDLER_URL', [], 'https://api.pimlico.io/v2/1/rpc'),
                paymasterUrl: getConfigValue('PAYMASTER_URL', [], 'https://api.pimlico.io/v2/1/rpc'),
                entryPoint: getConfigValue('ENTRYPOINT_ADDRESS', [], '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'),
            },
            bundlerUrl: getConfigValue('BUNDLER_URL', ['bundler_url'], null),
            paymasterUrl: getConfigValue('PAYMASTER_URL', ['paymaster_url'], null),
            entrypointAddress: getConfigValue('ENTRYPOINT_ADDRESS', ['entrypoint_address'], '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'),

            // Wallet Configuration - Using .env as overriding source
            walletAddress: walletAddress,
            privateKey: privateKey,

            // Market Data APIs
            marketData: {
                coingeckoUrl: getConfigValue('COINGECKO_API_URL', [], 'https://api.coingecko.com/api/v3'),
                dexscreenerUrl: getConfigValue('DEXSCREENER_API_URL', [], 'https://api.dexscreener.com/latest/dex'),
                birdeyeUrl: getConfigValue('BIRDEYE_API_URL', [], 'https://public-api.birdeye.so'),
            },

            // Market Data API Keys
            marketApiKeys: {
                coingecko: getConfigValue('COINGECKO_API_KEY', [], null),
                birdeye: getConfigValue('BIRDEYE_API_KEY', [], null),
            },

            // Authentication Configuration
            auth: {
                adminEmail: getConfigValue('ADMIN_EMAIL', [], 'iamtemam@gmail.com'),
                adminPasswordHash: getConfigValue('ADMIN_PASSWORD_HASH', [], '$2b$12$EHjRMYpfJVsqFmZ.avN80OUZsLm7UoQY3S6euIZxrd3bkTWA6eR16'),
                jwtSecret: getConfigValue('JWT_SECRET', [], null),
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
            { name: 'Private Key', value: this.config.privateKey ? 'configured' : 'MISSING' },
            { name: 'Pimlico API', value: this.config.pimlicoApiKey ? 'configured' : 'MISSING' },
            { name: 'Alchemy API', value: this.config.alchemyApiKey ? 'configured' : 'MISSING' },
            { name: 'ETH RPC', value: this.config.rpcUrls.ethereum ? 'configured' : 'MISSING' },
            { name: 'WebSocket ETH', value: this.config.wsUrls.ethereum ? 'configured' : 'MISSING' },
            { name: 'Coingecko', value: this.config.marketData.coingeckoUrl ? 'configured' : 'MISSING' },
            { name: 'DexScreener', value: this.config.marketData.dexscreenerUrl ? 'configured' : 'MISSING' },
            { name: 'Birdeye', value: this.config.marketData.birdeyeUrl ? 'configured' : 'MISSING' },
            { name: 'Admin Email', value: this.config.auth?.adminEmail || 'default' },
            { name: 'JWT Secret', value: this.config.auth?.jwtSecret ? 'configured' : 'auto-generated' },
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
        this.config = { ...this.config, newConfig };
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
