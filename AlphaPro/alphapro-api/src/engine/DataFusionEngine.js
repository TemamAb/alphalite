/**
 * alphapro-data/ingestors/DataFusionEngine.js
 * Aggregates real-time data from Tier 1 (Nodes) and Tier 2 (DEX Aggregators).
 */

const EventEmitter = require('events');
const WebSocket = require('ws');


const ReconnectingWebSocket = require('reconnecting-websocket');
const axios = require('axios');
const path = require('path');
const { setTimeout } = require('timers/promises'); // Using promises version for async/await
const config = require(path.join(__dirname, '..', '..', 'data_sources.json'));
const configService = require('../../configService');

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
            { id: 'ethereum', name: 'Ethereum', alchemyUrl: appConfig.wsUrls.ethereum || 'wss://eth-mainnet.g.alchemy.com/v2/' },
            { id: 'arbitrum', name: 'Arbitrum', alchemyUrl: appConfig.wsUrls.arbitrum || 'wss://arb-mainnet.g.alchemy.com/v2/' },
            { id: 'polygon', name: 'Polygon', alchemyUrl: appConfig.wsUrls.polygon || 'wss://polygon-mainnet.g.alchemy.com/v2/' },
            { id: 'optimism', name: 'Optimism', alchemyUrl: appConfig.wsUrls.optimism || 'wss://opt-mainnet.g.alchemy.com/v2/' },
            { id: 'base', name: 'Base', alchemyUrl: appConfig.wsUrls.base || 'wss://base-mainnet.g.alchemy.com/v2/' }
        ];
    }

    /**
     * Starts the fusion engine: Connects to WebSocket streams for live data.
     */
    async start() {
        if (!this.alchemyKey) {
            console.error("[DATA-FUSION] ❌ CRITICAL: No ALCHEMY_API_KEY configured. Cannot start live data streams.");
            console.error("[DATA-FUSION] Please set ALCHEMY_API_KEY environment variable.");
            process.exit(1);
        }
        
        // Connect to all configured chains concurrently
        let connectedCount = 0;
        this.chains.forEach(chain => {
            if (this.connectChain(chain)) {
                connectedCount++;
            }
        });

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
        
        if (!connected) {
            console.error("[DATA-FUSION] ❌ CRITICAL: Failed to establish any WebSocket connections to blockchain networks.");
            console.error("[DATA-FUSION] Please check your ALCHEMY_API_KEY and network connectivity.");
            process.exit(1);
        }

        this.isLive = true;
        console.log("[DATA-FUSION] 🚀 LIVE Engine Started - Connected to blockchain networks.");
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
        let url = chain.alchemyUrl;
        if (this.alchemyKey && !url.includes(this.alchemyKey)) {
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
                console.error(`[DATA-FUSION] ❌ ${chain.name} WS Error:`, err.message);
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