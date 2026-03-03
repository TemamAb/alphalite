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
        
        // Initialize all provider paths
        this.initializeProviders();
    }
    
    initializeProviders() {
        // Provider configurations - ordered by expected performance
        const providerConfigs = [
            {
                id: 'alchemy',
                name: 'Alchemy',
                rpc: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mK2nj6ZSi1mZ2THJMUHcF',
                ws: process.env.ETH_WS_URL || null,
                priority: 1
            },
            {
                id: 'publicnode',
                name: 'PublicNode',
                rpc: 'https://ethereum.publicnode.com',
                ws: 'wss://ethereum.publicnode.com',
                priority: 2
            },
            {
                id: '1rpc',
                name: '1RPC',
                rpc: 'https://1rpc.io/eth',
                ws: null,
                priority: 3
            },
            {
                id: 'ankr',
                name: 'Ankr',
                rpc: 'https://rpc.ankr.com/eth',
                ws: null,
                priority: 4
            }
        ];
        
        providerConfigs.forEach(config => {
            this.providers.set(config.id, {
                ...config,
                connected: false,
                lastLatency: null,
                txCount: 0
            });
        });
    }
    
    /**
     * Start all provider connections in parallel
     */
    async start() {
        console.log('[MULTI-PATH] 🚀 Starting parallel mempool detection...');
        
        const connectionPromises = [];
        
        for (const [id, provider] of this.providers) {
            if (provider.ws) {
                connectionPromises.push(this.connectWebSocket(id, provider));
            } else {
                connectionPromises.push(this.testREST(id, provider));
            }
        }
        
        // Wait for all connections (with timeout)
        await Promise.race([
            Promise.allSettled(connectionPromises),
            new Promise(resolve => setTimeout(resolve, 5000))
        ]);
        
        console.log('[MULTI-PATH] ✅ Multi-path detection active');
        console.log('[MULTI-PATH] 📊 Provider status:');
        
        for (const [id, provider] of this.providers) {
            const status = provider.connected ? '✅' : '❌';
            const latency = provider.lastLatency ? `${provider.lastLatency}ms` : 'N/A';
            console.log(`[MULTI-PATH]   ${status} ${provider.name}: ${latency}`);
        }
    }
    
    /**
     * Connect WebSocket provider
     */
    connectWebSocket(id, provider) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            try {
                const ws = new WebSocket(provider.ws);
                
                ws.on('open', () => {
                    const latency = Date.now() - startTime;
                    provider.connected = true;
                    provider.lastLatency = latency;
                    provider.ws = ws;
                    this.activeConnections++;
                    
                    console.log(`[MULTI-PATH] ✅ ${provider.name} connected in ${latency}ms`);
                    
                    // Subscribe to pending transactions
                    ws.send(JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'eth_subscribe',
                        params: ['newPendingTransactions']
                    }));
                    
                    resolve(true);
                });
                
                ws.on('message', (data) => {
                    provider.txCount++;
                    this.emitTransaction({
                        provider: id,
                        name: provider.name,
                        data: JSON.parse(data),
                        latency: Date.now() - startTime
                    });
                });
                
                ws.on('error', (err) => {
                    console.log(`[MULTI-PATH] ⚠️ ${provider.name} error: ${err.message}`);
                    provider.connected = false;
                    resolve(false);
                });
                
                ws.on('close', () => {
                    provider.connected = false;
                    console.log(`[MULTI-PATH] ❌ ${provider.name} disconnected`);
                });
                
            } catch (err) {
                console.log(`[MULTI-PATH] ❌ ${provider.name} failed to connect: ${err.message}`);
                resolve(false);
            }
        });
    }
    
    /**
     * Test REST endpoint latency
     */
    async testREST(id, provider) {
        const startTime = Date.now();
        
        try {
            const response = await fetch(provider.rpc, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_blockNumber',
                    params: [],
                    id: 1
                })
            });
            
            const latency = Date.now() - startTime;
            
            if (response.ok) {
                provider.connected = true;
                provider.lastLatency = latency;
                provider.restLatency = latency;
                console.log(`[MULTI-PATH] ✅ ${provider.name} REST tested: ${latency}ms`);
                return true;
            }
        } catch (err) {
            console.log(`[MULTI-PATH] ❌ ${provider.name} REST failed: ${err.message}`);
        }
        
        return false;
    }
    
    /**
     * Emit transaction from fastest provider
     */
    emitTransaction(event) {
        // Find fastest provider
        let fastest = null;
        let fastestLatency = Infinity;
        
        for (const [id, provider] of this.providers) {
            if (provider.connected && provider.lastLatency < fastestLatency) {
                fastest = provider;
                fastestLatency = provider.lastLatency;
            }
        }
        
        // Only emit from fastest provider to avoid duplicates
        if (fastest && event.provider === fastest.id) {
            this.emit('transaction', {
                ...event,
                fastestProvider: fastest.name,
                isFastest: true
            });
        }
    }
    
    /**
     * Get current fastest provider
     */
    getFastestProvider() {
        let fastest = null;
        let minLatency = Infinity;
        
        for (const [id, provider] of this.providers) {
            if (provider.connected && provider.lastLatency && provider.lastLatency < minLatency) {
                fastest = { id, ...provider };
                minLatency = provider.lastLatency;
            }
        }
        
        return fastest;
    }
    
    /**
     * Get diagnostic stats
     */
    getStats() {
        const stats = {
            active: this.activeConnections,
            providers: []
        };
        
        for (const [id, provider] of this.providers) {
            stats.providers.push({
                id,
                name: provider.name,
                connected: provider.connected,
                latency: provider.lastLatency,
                txCount: provider.txCount
            });
        }
        
        return stats;
    }
    
    /**
     * Stop all connections
     */
    stop() {
        console.log('[MULTI-PATH] 🛑 Stopping all connections...');
        
        for (const [id, provider] of this.providers) {
            if (provider.ws && provider.ws.close) {
                provider.ws.close();
            }
            provider.connected = false;
        }
        
        this.activeConnections = 0;
    }
}

module.exports = MultiPathDetector;
