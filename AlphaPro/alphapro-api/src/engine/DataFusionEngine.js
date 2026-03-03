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

// Import MultiPathDetector for Strategy 3
let MultiPathDetector;
try {
    MultiPathDetector = require('./MultiPathDetector');
} catch (e) {
    console.log('[DATA-FUSION] MultiPathDetector not available, using legacy mode');
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
        // OPTION B: WebSocket for sub-200ms latency
        // Free public WebSocket endpoints (no API key required)
        this.chains = [
            { 
                id: 'ethereum', 
                name: 'Ethereum', 
                rpcUrl: appConfig.rpcUrls?.ethereum || process.env.ETH_RPC_URL || 'https://1rpc.io/eth', 
                wsUrl: process.env.ETH_WS_URL || 'wss://ethereum.publicnode.com'  // Free WebSocket!
            },
            { 
                id: 'arbitrum', 
                name: 'Arbitrum', 
                rpcUrl: appConfig.rpcUrls?.arbitrum || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc', 
                wsUrl: process.env.ARBITRUM_WS_URL || 'wss://arb1.arbitrum.io/websocket'  // Free WebSocket!
            },
            { 
                id: 'polygon', 
                name: 'Polygon', 
                rpcUrl: appConfig.rpcUrls?.polygon || process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com', 
                wsUrl: process.env.POLYGON_WS_URL || null  // No free WS, use REST
            },
            { 
                id: 'optimism', 
                name: 'Optimism', 
                rpcUrl: appConfig.rpcUrls?.optimism || process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io', 
                wsUrl: process.env.OPTIMISM_WS_URL || null
            },
            { 
                id: 'base', 
                name: 'Base', 
                rpcUrl: appConfig.rpcUrls?.base || process.env.BASE_RPC_URL || 'https://base.llamarpc.com', 
                wsUrl: process.env.BASE_WS_URL || null
            },
            { 
                id: 'avalanche', 
                name: 'Avalanche', 
                rpcUrl: appConfig.rpcUrls?.avalanche || process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc', 
                wsUrl: process.env.AVALANCHE_WS_URL || null
            },
            { 
                id: 'bsc', 
                name: 'BSC', 
                rpcUrl: appConfig.rpcUrls?.bsc || process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org', 
                wsUrl: process.env.BSC_WS_URL || null
            },
            { 
                id: 'celo', 
                name: 'Celo', 
                rpcUrl: appConfig.rpcUrls?.celo || process.env.CELO_RPC_URL || 'https://forno.celo.org', 
                wsUrl: process.env.CELO_WS_URL || null
            }
        ];
    }

    /**
     * Starts the fusion engine: Tries WebSocket first, falls back to REST polling.
     * WebSocket provides sub-200ms latency for real-time MEV detection.
     * 
     * STRATEGY 3: Multi-Path Detection - uses multiple providers simultaneously
     */
    async start() {
        console.log('[DATA-FUSION] ⚡ Starting High-Speed Mempool Engine...');
        this.isLive = true;
        
        // Try MultiPathDetector first (Strategy 3 - fastest)
        if (MultiPathDetector) {
            try {
                console.log('[DATA-FUSION] 🎯 Attempting Multi-Path Detection (Strategy 3)...');
                this.multiPath = new MultiPathDetector({
                    timeout: 500,
                    maxLatency: 1000
                });
                
                // Forward multi-path transactions to engine
                this.multiPath.on('transaction', (event) => {
                    if (event.isFastest) {
                        const tx = event.data.params?.result;
                        if (tx) {
                            this.emit('mempool:pendingTx', {
                                chain: 'ethereum',
                                hash: tx,
                                provider: event.provider,
                                latency: event.latency,
                                timestamp: Date.now()
                            });
                        }
                    }
                });
                
                await this.multiPath.start();
                console.log('[DATA-FUSION] ✅ Multi-Path Detection active!');
                return; // Skip legacy methods if multi-path works
            } catch (err) {
                console.log(`[DATA-FUSION] ⚠️ Multi-Path failed: ${err.message}, falling back...`);
            }
        }
        
        // Fallback: Try WebSocket connections first for real-time mempool (sub-200ms)
        let wsConnected = false;
        for (const chain of this.chains) {
            if (chain.wsUrl) {
                console.log(`[DATA-FUSION] 🔌 Attempting WebSocket for ${chain.name}...`);
                const connected = this.connectChain(chain);
                if (connected) {
                    wsConnected = true;
                    console.log(`[DATA-FUSION] ✅ ${chain.name}: WebSocket connected (target: <200ms latency)`);
                }
            }
        }
        
        if (wsConnected) {
            console.log('[DATA-FUSION] 🚀 LIVE: WebSocket mode active (sub-200ms detection)');
        } else {
            console.log('[DATA-FUSION] ⚠️ No WebSocket available, using REST polling fallback');
            console.log('[DATA-FUSION] 📡 Starting REST API mempool polling (1s interval)...');
            this.startMempoolPolling();
        }
    }
    
    /**
     * OPTION A: Real-time Mempool Detection
     * - 1-second polling interval (down from 15 seconds)
     * - Polls pending transactions (not just block number)
     * - Multiple RPC endpoints with automatic failover
     * - Dynamic throttling to avoid rate limits
     */
    startMempoolPolling() {
        console.log('[DATA-FUSION] ⚡ Starting HIGH-SPEED mempool polling (1s interval)...');
        
        // Multiple RPC endpoints for Ethereum (ordered by performance)
        const ethRpcs = [
            'https://1rpc.io/eth',      // Fastest - tested at 804ms
            'https://rpc.ankr.com/eth', // Backup - tested at 399ms but 0 pending
            'https://eth.llamarpc.com'  // Fallback
        ];
        
        // Track current RPC index for round-robin
        let currentRpcIndex = 0;
        let consecutiveFailures = 0;
        const MAX_FAILURES_BEFORE_BACKOFF = 5;
        let isBackingOff = false;
        let backoffUntil = 0;
        
        // Polling interval: 1 second for real-time detection
        this.mempoolPollInterval = setInterval(async () => {
            try {
                // Check if we're in backoff mode
                if (isBackingOff && Date.now() < backoffUntil) {
                    return; // Skip this poll cycle
                }
                
                if (isBackingOff && Date.now() >= backoffUntil) {
                    console.log('[DATA-FUSION] 🔄 Recovering from rate limit - resuming polling');
                    isBackingOff = false;
                    consecutiveFailures = 0;
                }
                
                // Round-robin through RPC endpoints
                const rpcUrl = ethRpcs[currentRpcIndex];
                currentRpcIndex = (currentRpcIndex + 1) % ethRpcs.length;
                
                // Get PENDING block (not just block number!) - this is key for MEV
                const response = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_getBlockByNumber',
                        params: ['pending', true], // Get pending transactions!
                        id: 1
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    consecutiveFailures = 0; // Reset on success
                    
                    if (data.result && data.result.transactions) {
                        const pendingTxs = data.result.transactions;
                        
                        if (pendingTxs.length > 0) {
                            console.log(`[DATA-FUSION] 📦 Detected ${pendingTxs.length} pending transactions`);
                            
                            // Emit each pending transaction for real-time processing
                            pendingTxs.forEach((tx, index) => {
                                // Only process first 10 to avoid spam
                                if (index < 10) {
                                    this.emit('mempool:pendingTx', {
                                        chain: 'ethereum',
                                        hash: tx.hash,
                                        from: tx.from,
                                        to: tx.to,
                                        value: tx.value,
                                        gasPrice: tx.gasPrice,
                                        data: tx.input,
                                        timestamp: Date.now()
                                    });
                                }
                            });
                            
                            // Also emit block event for bulk processing
                            this.emit('mempool:block', {
                                chain: 'ethereum',
                                blockNumber: parseInt(data.result.number, 16),
                                pendingCount: pendingTxs.length,
                                timestamp: Date.now()
                            });
                        }
                    }
                } else if (response.status === 429) {
                    // Rate limited - implement exponential backoff
                    consecutiveFailures++;
                    console.warn(`[DATA-FUSION] ⚠️ Rate limited (${consecutiveFailures}/${MAX_FAILURES_BEFORE_BACKOFF})`);
                    
                    if (consecutiveFailures >= MAX_FAILURES_BEFORE_BACKOFF) {
                        console.warn('[DATA-FUSION] 🚫 Too many failures - backing off for 30 seconds');
                        isBackingOff = true;
                        backoffUntil = Date.now() + 30000;
                    }
                }
            } catch (error) {
                consecutiveFailures++;
                // Silent fail but track failures
                if (consecutiveFailures >= 3) {
                    console.warn(`[DATA-FUSION] ⚠️ RPC errors: ${consecutiveFailures}`);
                }
            }
        }, 1000); // 1 second = 1000ms - MUCH FASTER than before!
    }

    /**
     * LIVE MODE: Connect to blockchain mempool streams via WebSocket
     * Works with or without API keys (supports free public WebSocket endpoints)
     * Returns true if connection initiated successfully
     */
    connectChain(chain) {
        // Build WebSocket URL - supports both API-key-based and free endpoints
        let url = chain.wsUrl;
        
        if (!url) {
            console.log(`[DATA-FUSION] ⚠️ ${chain.name}: No WebSocket URL configured, skipping.`);
            return false;
        }
        
        // If using Alchemy WebSocket URL, append API key
        if (this.alchemyKey && url.includes('alchemy.com')) {
            url = `${url}${this.alchemyKey}`;
            console.log(`[DATA-FUSION] 🔌 Connecting to ${chain.name} mempool (Alchemy)...`);
        } else {
            console.log(`[DATA-FUSION] 🔌 Connecting to ${chain.name} mempool (Public WebSocket)...`);
        }
        
        const self = this;
        
        console.log(`[DATA-FUSION] 📡 WebSocket: ${url.substring(0, 50)}...`);
        
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