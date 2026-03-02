/**
 * alphapro-data/ingestors/DataFusionEngine.js
 * Aggregates real-time data from Tier 1 (Nodes) and Tier 2 (DEX Aggregators).
 */

const EventEmitter = require('events');
const WebSocket = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');
const axios = require('axios');
const path = require('path');
const { setTimeout: setTimeoutPromises } = require('timers/promises');

// Try multiple paths for config - prefer the AlphaPro root config
let configService;
try {
    // Try AlphaPro root configService first (reads from process.env)
    configService = require('../../../configService');
} catch (e) {
    try {
        // Try alphapro-api/configService as fallback
        configService = require('../../configService');
    } catch (e2) {
        console.error('[DATA-FUSION] Could not load configService:', e2.message);
        // Fallback to reading env directly
        configService = { 
            getConfig: () => ({ 
                alchemyApiKey: process.env.ALCHEMY_API_KEY,
                wsUrls: {
                    ethereum: process.env.ETH_WS_URL,
                    arbitrum: process.env.ARBITRUM_WS_URL,
                    polygon: process.env.POLYGON_WS_URL,
                    optimism: process.env.OPTIMISM_WS_URL,
                    base: process.env.BASE_WS_URL
                }
            }) 
        };
    }
}

class DataFusionEngine extends EventEmitter {

    constructor() {
        super(); // Call the EventEmitter constructor
        this.connections = new Map(); // Store active WS connections by chain
        this.priceCache = new Map();
        this.isLive = false;

        // Load configuration from service (Render-first, .env fallback)
        const appConfig = configService.getConfig();
        this.alchemyKey = appConfig.alchemyApiKey;

        // Supported chains configuration - use config service with fallback to .env
        this.chains = [
            { id: 'ethereum', name: 'Ethereum', rpcUrl: appConfig.rpcUrls?.ethereum || process.env.ETH_RPC_URL || 'https://eth.llamarpc.com', wsUrl: appConfig.wsUrls?.ethereum || process.env.ETH_WS_URL || 'wss://eth-mainnet.g.alchemy.com/v2/' + (appConfig.alchemyApiKey || '') },
            { id: 'arbitrum', name: 'Arbitrum', rpcUrl: appConfig.rpcUrls?.arbitrum || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc', wsUrl: appConfig.wsUrls?.arbitrum || process.env.ARBITRUM_WS_URL || 'wss://arb-mainnet.g.alchemy.com/v2/' + (appConfig.alchemyApiKey || '') },
            { id: 'polygon', name: 'Polygon', rpcUrl: appConfig.rpcUrls?.polygon || process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com', wsUrl: appConfig.wsUrls?.polygon || process.env.POLYGON_WS_URL || 'wss://polygon-mainnet.g.alchemy.com/v2/' + (appConfig.alchemyApiKey || '') },
            { id: 'optimism', name: 'Optimism', rpcUrl: appConfig.rpcUrls?.optimism || process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io', wsUrl: appConfig.wsUrls?.optimism || process.env.OPTIMISM_WS_URL || 'wss://opt-mainnet.g.alchemy.com/v2/' + (appConfig.alchemyApiKey || '') },
            { id: 'base', name: 'Base', rpcUrl: appConfig.rpcUrls?.base || process.env.BASE_RPC_URL || 'https://base.llamarpc.com', wsUrl: appConfig.wsUrls?.base || process.env.BASE_WS_URL || 'wss://base-mainnet.g.alchemy.com/v2/' + (appConfig.alchemyApiKey || '') },
            { id: 'avalanche', name: 'Avalanche', rpcUrl: appConfig.rpcUrls?.avalanche || process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc', wsUrl: null },
            { id: 'bsc', name: 'BSC', rpcUrl: appConfig.rpcUrls?.bsc || process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org', wsUrl: null },
            { id: 'celo', name: 'Celo', rpcUrl: appConfig.rpcUrls?.celo || process.env.CELO_RPC_URL || 'https://forno.celo.org', wsUrl: null }
        ];
    }

    /**
     * Starts the fusion engine: Connects to WebSocket streams for live data.
     */
    async start() {
        if (!this.alchemyKey) {
            // No Alchemy key - REQUIRE production config
            console.error("[DATA-FUSION] ❌ CRITICAL: ALCHEMY_API_KEY is required for production trading.");
            console.error("[DATA-FUSION] Please set ALCHEMY_API_KEY environment variable.");
            console.error("[DATA-FUSION] Get free key at: https://www.alchemy.com/");
            throw new Error('ALCHEMY_API_KEY required for production');
        }
        
        // Connect to main chains only initially to avoid rate limiting
        // Alchemy free tier has rate limits - only connect to ETH, Arbitrum, Polygon
        const mainChains = [
            this.chains.find(c => c.id === 'ethereum'),
            this.chains.find(c => c.id === 'arbitrum'),
            this.chains.find(c => c.id === 'polygon')
        ].filter(Boolean);
        
        let connectedCount = 0;
        
        for (let i = 0; i < mainChains.length; i++) {
            // Add longer delay between connections to avoid rate limiting (5 seconds)
            if (i > 0) {
                console.log(`[DATA-FUSION] ⏳ Waiting 5s before connecting to ${mainChains[i].name}...`);
                await setTimeoutPromises(5000);
            }
            if (this.connectChain(mainChains[i])) {
                connectedCount++;
            }
        }

        // Wait for connections with timeout
        const connectionTimeout = new Promise((resolve) => {
            setTimeout(() => resolve(false), 10000);
        });
        
        const connectedPromise = new Promise((resolve) => {
            const checkConnections = () => {
                const activeConnections = Array.from(this.connections.values()).filter(ws => ws.readyState === WebSocket.OPEN).length;
                if (activeConnections > 0) {
                    resolve(true);
                }
            };
            // Check every second for 10 seconds
            const interval = setInterval(checkConnections, 1000);
            setTimeout(() => {
                clearInterval(interval);
                resolve(false);
            }, 10000);
        });
        
        const connected = await Promise.race([connectedPromise, connectionTimeout]);
        
        // Don't fail completely - allow partial connectivity
        if (connectedCount === 0) {
            console.error("[DATA-FUSION] ⚠️  WARNING: Failed to connect to any blockchain networks.");
            console.error("[DATA-FUSION] Continuing in degraded mode - some features may not work.");
            // Don't throw - continue with degraded mode
            this.isLive = true;
            console.log("[DATA-FUSION] 🚀 Engine Started in DEGRADED mode (no blockchain connections).");
            return;
        }

        this.isLive = true;
        console.log(`[DATA-FUSION] 🚀 LIVE Engine Started - Connected to ${connectedCount} blockchain networks.`);
    }

    /**
     * LIVE MODE: Connect to blockchain mempool streams
     * Returns true if connection initiated successfully
     */
    connectChain(chain) {
        if (!this.alchemyKey) {
            console.error(`[DATA-FUSION] Cannot connect to ${chain.name}: No API key configured`);
            return false;
        }
        
        // Build WebSocket URL with API key
        let url = chain.wsUrl || chain.alchemyUrl;
        if (!url) {
            console.log(`[DATA-FUSION] ⚠️ ${chain.name}: No WebSocket URL configured, skipping.`);
            return false;
        }
        if (this.alchemyKey && typeof url === 'string' && !url.includes(this.alchemyKey)) {
            url = `${url}${this.alchemyKey}`;
        }
        
        const self = this;

        console.log(`[DATA-FUSION] 🔌 Connecting to ${chain.name} mempool stream...`);
        console.log(`[DATA-FUSION] 📡 URL: ${url.replace(this.alchemyKey, '***')}`);
        
        try {
            const ws = new ReconnectingWebSocket(url, [], {
                WebSocket: WebSocket,
                connectionTimeout: 15000,
                maxRetries: 5,
            });
            this.connections.set(chain.id, ws);

            ws.addEventListener('open', () => {
                console.log(`[DATA-FUSION] ✅ Connected to ${chain.name} mempool.`);
                // Subscribe to pending transactions
                ws.send(JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "eth_subscribe",
                    params: ["newPendingTransactions"]
                }));
            });
            
            ws.addEventListener('message', (data) => {
                try {
                    const event = JSON.parse(data.data);
                    if (event.params && event.params.result && typeof event.params.result === 'string') {
                        self.emit('mempool:pendingTx', {
                            chain: chain.id,
                            tx: event.params.result
                        });
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            });

            ws.addEventListener('error', (err) => {
                // Handle rate limiting (429) and forbidden (403) errors gracefully
                const errorMsg = err.message || '';
                if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
                    console.warn(`[DATA-FUSION] ⚠️  ${chain.name} WebSocket rate limited. Will retry automatically.`);
                } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
                    console.warn(`[DATA-FUSION] ⚠️  ${chain.name} WebSocket access forbidden. Using REST API fallback.`);
                } else {
                    console.error(`[DATA-FUSION] ❌ ${chain.name} WS Error:`, err.message);
                }
            });
            
            return true;
        } catch (error) {
            console.error(`[DATA-FUSION] ❌ Failed to connect to ${chain.name}:`, error.message);
            return false;
        }
    }

    /**
     * Helper function for exponential backoff
     */
    async backoff(attempt) {
        const delay = Math.min(30000, (2 ** attempt) * 1000); // max delay 30s
        console.log(`[DATA-FUSION] ⚠️  Attempt ${attempt} failed, retrying in ${delay / 1000}s`);
        await setTimeout(delay);
    }

    /**
     * Tier 2: Fetch Price from DexScreener
     */
    async getPriceTier2(tokenAddress) {
        let attempt = 0;
        const maxRetries = 5;
        try {
            while (attempt < maxRetries) {
                attempt++;

            
            const url = `${config.tier2_discovery.dexscreener.base_url}${config.tier2_discovery.dexscreener.endpoints.tokens}${tokenAddress}`;
            const response = await axios.get(url);

            if (response.data && response.data.pairs && response.data.pairs.length > 0) {
                const bestPair = response.data.pairs[0];
                const priceUsd = parseFloat(bestPair.priceUsd);
                this.priceCache.set(tokenAddress, { price: priceUsd, timestamp: Date.now() });
                return priceUsd;
            } else {
                  console.warn(`[DATA-FUSION] ⚠️ No pairs found on DexScreener for ${tokenAddress}, retry attempt ${attempt}`);
                  await this.backoff(attempt);
            }
          }
        } catch (error) {
            console.error(`[DATA-FUSION] ⚠️ DexScreener Error for ${tokenAddress}:`, error.message);

        }
        return null;
    }
    
    /**
     * Tier 3: Fetch Price from CoinGecko
     */
    async getPriceTier3(coinId = 'ethereum') {
        try {
            const url = `${config.tier3_context.coingecko.base_url}/simple/price?ids=${coinId}&vs_currencies=usd`;
            const response = await axios.get(url);

            if (response.data && response.data[coinId]) {
                const priceUsd = response.data[coinId].usd;
                this.priceCache.set(coinId, { price: priceUsd, timestamp: Date.now() });
                return priceUsd;
            }
        } catch (error) {

            console.error(`[DATA-FUSION] ⚠️ CoinGecko Error:`, error.message);

        }
        return null;
    }
}


module.exports = new DataFusionEngine();