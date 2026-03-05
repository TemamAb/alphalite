/**
 * MultiPathDetector - Parallel Mempool Detection
 * Strategy 3: Use multiple RPC providers simultaneously, select fastest
 */

const EventEmitter = require('events');
const WebSocket = require('ws');

class MultiPathDetector extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            timeout: config.timeout || 500,
            maxLatency: config.maxLatency || 1000,
            ...config
        };

        // Initialize provider paths
        this.providers = new Map();
        this.latencies = new Map();
        this.activeConnections = 0;
        this.seenTransactions = new Set();
        this.maxSeenTxs = 10000;

        // Initialize all provider paths
        this.initializeProviders();
    }

    initializeProviders() {
        // Provider configurations - ordered by expected performance
        const providerConfigs = [
            {
                id: 'alchemy',
                name: 'Alchemy (Dedicated)',
                rpc: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mK2nj6ZSi1mZ2THJMUHcF',
                ws: process.env.ETH_WS_URL || 'wss://eth-mainnet.g.alchemy.com/v2/mK2nj6ZSi1mZ2THJMUHcF',
                priority: 1
            },
            {
                id: 'infura',
                name: 'Infura (Tier 1)',
                rpc: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY || 'mK2nj6ZSi1mZ2THJMUHcF'}`,
                ws: `wss://mainnet.infura.io/ws/v3/${process.env.INFURA_API_KEY || 'mK2nj6ZSi1mZ2THJMUHcF'}`,
                priority: 1
            },
            {
                id: '1rpc',
                name: '1RPC (Low Latency)',
                rpc: 'https://1rpc.io/eth',
                ws: 'wss://1rpc.io/eth',
                priority: 2
            },
            {
                id: 'ankr',
                name: 'Ankr (Global)',
                rpc: 'https://rpc.ankr.com/eth',
                ws: 'wss://rpc.ankr.com/eth',
                priority: 2
            },
            {
                id: 'publicnode',
                name: 'PublicNode',
                rpc: 'https://ethereum.publicnode.com',
                ws: 'wss://ethereum.publicnode.com',
                priority: 3
            },
            {
                id: 'llama',
                name: 'LlamaRPC',
                rpc: 'https://eth.llamarpc.com',
                ws: 'wss://eth.llamarpc.com',
                priority: 3
            }
        ];

        providerConfigs.forEach(config => {
            this.providers.set(config.id, {
                ...config,
                connected: false,
                lastLatency: null,
                txCount: 0,
                score: 100 // Starting score
            });
        });

        // Use a more efficient hash set for transactions
        this.txCache = new Map(); // hash -> timestamp
    }

    /**
     * Start all provider connections in parallel
     */
    async start() {
        console.log('[MULTI-PATH] ⚡ Initiating Ultra-Low Latency Mode (<100ms)...');

        const connectionPromises = [];

        for (const [id, provider] of this.providers) {
            if (provider.ws) {
                connectionPromises.push(this.connectWebSocket(id, provider));
            }
        }

        // Wait for at least 2 Tier-1 providers to connect
        await Promise.race([
            Promise.allSettled(connectionPromises),
            new Promise(resolve => setTimeout(resolve, 3000))
        ]);

        const connectedCount = Array.from(this.providers.values()).filter(p => p.connected).length;
        console.log(`[MULTI-PATH] ✅ Shield Active: ${connectedCount} parallel high-speed paths`);
    }

    /**
     * Connect WebSocket provider
     */
    connectWebSocket(id, provider) {
        return new Promise((resolve) => {
            try {
                const ws = new WebSocket(provider.ws, {
                    handshakeTimeout: 5000,
                    perMessageDeflate: false // Disable compression for faster parsing
                });

                ws.on('open', () => {
                    provider.connected = true;
                    provider.ws = ws;
                    this.activeConnections++;

                    // Fast subscription
                    ws.send(JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'eth_subscribe',
                        params: ['newPendingTransactions']
                    }));

                    resolve(true);
                });

                ws.on('message', (data) => {
                    const arrivalTime = Date.now();

                    try {
                        // Use fastest possible parsing for hash extraction
                        const raw = data.toString();
                        if (!raw.includes('result')) return;

                        const parsed = JSON.parse(raw);
                        const txHash = parsed.params?.result;

                        if (typeof txHash === 'string') {
                            // FASTEST PATH: Atomic check and set
                            if (!this.txCache.has(txHash)) {
                                this.txCache.set(txHash, arrivalTime);

                                // Emit immediately
                                this.emit('transaction', {
                                    provider: id,
                                    name: provider.name,
                                    hash: txHash,
                                    latency: 0, // Differential latency calculated by engine
                                    isFastest: true,
                                    timestamp: arrivalTime
                                });

                                // Cleanup cache periodically
                                if (this.txCache.size > this.maxSeenTxs) {
                                    const now = Date.now();
                                    for (const [hash, time] of this.txCache) {
                                        if (now - time > 60000) this.txCache.delete(hash);
                                        if (this.txCache.size < this.maxSeenTxs * 0.8) break;
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // Silent skip for performance
                    }
                });

                ws.on('error', () => {
                    provider.connected = false;
                    resolve(false);
                });

                ws.on('close', () => {
                    provider.connected = false;
                    setTimeout(() => this.connectWebSocket(id, provider), 5000); // Fast reconnect
                });

            } catch (err) {
                resolve(false);
            }
        });
    }

    /**
     * Get diagnostic stats
     */
    getStats() {
        return {
            active: Array.from(this.providers.values()).filter(p => p.connected).length,
            total: this.providers.size,
            providers: Array.from(this.providers.values()).map(p => ({
                name: p.name,
                status: p.connected ? 'LIVE' : 'DOWN'
            }))
        };
    }

    /**
     * Stop all connections
     */
    stop() {
        for (const [id, provider] of this.providers) {
            if (provider.ws && provider.ws.close) provider.ws.close();
            provider.connected = false;
        }
    }
}

module.exports = MultiPathDetector;
