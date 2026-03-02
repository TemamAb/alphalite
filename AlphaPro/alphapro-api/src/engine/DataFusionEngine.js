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
const config = require(path.join(__dirname, '..', '..', 'data_sources.json')); //Fixed: Corrected Path
class DataFusionEngine extends EventEmitter {

    constructor() {
        super(); // Call the EventEmitter constructor
        this.connections = new Map(); // Store active WS connections by chain
        this.priceCache = new Map();
        this.isLive = false;
        this.simulationInterval = null;

        // Load API Keys from Environment
        this.alchemyKey = process.env.ALCHEMY_API_KEY;

        // Supported chains configuration - Multi-chain support using env vars
        this.chains = [
            { id: 'ethereum', name: 'Ethereum', alchemyUrl: process.env.ETH_WS_URL || 'wss://eth-mainnet.g.alchemy.com/v2/' },
            { id: 'arbitrum', name: 'Arbitrum', alchemyUrl: process.env.ARBITRUM_WS_URL || 'wss://arb-mainnet.g.alchemy.com/v2/' },
            { id: 'polygon', name: 'Polygon', alchemyUrl: process.env.POLYGON_WS_URL || 'wss://polygon-mainnet.g.alchemy.com/v2/' },
            { id: 'optimism', name: 'Optimism', alchemyUrl: process.env.OPTIMISM_WS_URL || 'wss://opt-mainnet.g.alchemy.com/v2/' },
            { id: 'base', name: 'Base', alchemyUrl: process.env.BASE_WS_URL || 'wss://base-mainnet.g.alchemy.com/v2/' }
        ];
    }

    /**
     * Starts the fusion engine: Connects to WS and starts polling fallback.
     */
    async start() {
        if (!this.alchemyKey) {
            console.warn("[DATA-FUSION] ⚠️ No WebSocket provider keys. Using simulation mode.");
           this.startSimulationMode();
        } else {
            // Connect to all configured chains concurrently
            this.chains.forEach(chain => this.connectChain(chain));

            // Safety fallback: If no connections open within 5 seconds, start simulation
            setTimeout(() => {
                const activeConnections = Array.from(this.connections.values()).some(ws => ws.readyState === WebSocket.OPEN);
                if (!activeConnections) {
                    console.warn("[DATA-FUSION] ⚠️ Connection timeout. Falling back to simulation mode.");
                    this.startSimulationMode();
                }
            }, 5000);
        }

        this.isLive = true;
        console.log("[DATA-FUSION] 🚀 Engine Started.");
    }

    /**
     * Start simulation mode for paper trading demo
     */
    startSimulationMode() {
        if (this.simulationInterval) return; // Prevent multiple intervals
        console.log("[DATA-FUSION] 🎮 Starting simulation mode for paper trading...");
        // Emit simulated mempool events periodically
        this.simulationInterval = setInterval(() =>  {
            const fakeTx = '0x' + Math.random().toString(16).substr(2, 64);
    
            console.log(`[BLOCKCHAIN] 🔍 Scanning Mempool... Found ${fakeTx.slice(0,10)}...`);

            this.emit('mempool:pendingTx', { chain: 'ethereum', tx: fakeTx });
        }, 8000); // Fixed: Every 8 seconds
    }

    /**
     * Connect to a specific chain's WebSocket stream
     */
    connectChain(chain) {
        // Use the URL directly - it already contains the API key from env vars
        // Check if URL already has key (ends with key) or needs key appended
        let url = chain.alchemyUrl;
        
        // If URL doesn't end with the API key, append it
        if (this.alchemyKey && !url.endsWith(this.alchemyKey) && !url.includes('/v2/')) {
            url = `${url}${this.alchemyKey}`;
        } else if (this.alchemyKey && !url.includes('/v2/')) {
            // For fallback URLs that only have the base path
            url = `${url}${this.alchemyKey}`;
        }
        
        const self = this;

        console.log(`[DATA-FUSION] 🔌 Connecting to ${chain.name} stream...`);
        console.log(`[DATA-FUSION] 📡 URL: ${url.replace(this.alchemyKey, '***')}`); // Log with masked key
        const ws = new ReconnectingWebSocket(url, [], {
            WebSocket: WebSocket,
            connectionTimeout: 10000,
            maxRetries: 10,
        });
        this.connections.set(chain.id, ws);

        ws.addEventListener('open', () => {
            console.log(`[DATA-FUSION] ✅ Connected to ${chain.name} Tier 1 Stream.`);
            // Subscribe to pending transactions
            ws.send(JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_subscribe",
                params: ["newPendingTransactions"]
            }));
        });
        
        ws.addEventListener('message', (data) => {
            const event = JSON.parse(data.data);
            if (event.params && event.params.result && typeof event.params.result === 'string') {
                // Emit event with chain context
                self.emit('mempool:pendingTx', {
                    chain: chain.id,
                    tx: event.params.result
                });
            }
        });

        ws.addEventListener('error', (err) => {
            console.error(`[DATA-FUSION] ❌ ${chain.name} WS Error:`, err.message);
            
            // If 401/403 auth error, fallback to simulation mode
            if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
                console.warn(`[DATA-FUSION] ⚠️ ${chain.name} authentication failed. Starting simulation mode...`);
                this.startSimulationMode();
            }
        });
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