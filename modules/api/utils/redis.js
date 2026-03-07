// redis.js - Redis caching layer for AlphaPro API
// Enterprise-grade caching for high-frequency trading

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis client
 */
async function getRedisClient() {
    if (redisClient && isConnected) {
        return redisClient;
    }

    try {
        const redis = require('redis');
        
        redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('[REDIS] Max reconnection attempts reached');
                        return new Error('Max reconnection attempts reached');
                    }
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        redisClient.on('error', (err) => {
            console.error('[REDIS] Error:', err.message);
            isConnected = false;
        });

        redisClient.on('connect', () => {
            console.log('[REDIS] Connected to Redis');
            isConnected = true;
        });

        redisClient.on('reconnecting', () => {
            console.log('[REDIS] Reconnecting...');
        });

        await redisClient.connect();
        return redisClient;
    } catch (error) {
        console.error('[REDIS] Failed to connect:', error.message);
        return null;
    }
}

/**
 * Check Redis connection
 */
async function checkConnection() {
    const client = await getRedisClient();
    if (!client) {
        return { connected: false, error: 'Redis not initialized' };
    }

    try {
        await client.ping();
        return { connected: true };
    } catch (error) {
        return { connected: false, error: error.message };
    }
}

/**
 * Disconnect Redis
 */
async function disconnect() {
    if (redisClient) {
        try {
            await redisClient.quit();
            redisClient = null;
            isConnected = false;
            console.log('[REDIS] Disconnected');
        } catch (error) {
            console.error('[REDIS] Disconnect error:', error.message);
        }
    }
}

// =====================================================
// CACHE OPERATIONS
// =====================================================

/**
 * Get value from cache
 */
async function get(key) {
    const client = await getRedisClient();
    if (!client) return null;

    try {
        const value = await client.get(key);
        if (value) {
            return JSON.parse(value);
        }
        return null;
    } catch (error) {
        console.error('[REDIS] Get error:', error.message);
        return null;
    }
}

/**
 * Set value in cache with TTL
 */
async function set(key, value, ttlSeconds = 300) {
    const client = await getRedisClient();
    if (!client) return false;

    try {
        await client.set(key, JSON.stringify(value), {
            EX: ttlSeconds
        });
        return true;
    } catch (error) {
        console.error('[REDIS] Set error:', error.message);
        return false;
    }
}

/**
 * Delete key from cache
 */
async function del(key) {
    const client = await getRedisClient();
    if (!client) return false;

    try {
        await client.del(key);
        return true;
    } catch (error) {
        console.error('[REDIS] Delete error:', error.message);
        return false;
    }
}

/**
 * Check if key exists
 */
async function exists(key) {
    const client = await getRedisClient();
    if (!client) return false;

    try {
        const result = await client.exists(key);
        return result === 1;
    } catch (error) {
        return false;
    }
}

// =====================================================
// TRADING-SPECIFIC CACHE OPERATIONS
// =====================================================

/**
 * Cache ranking data (short TTL for real-time data)
 */
async function cacheRankings(data, ttlSeconds = 30) {
    return set('rankings:latest', data, ttlSeconds);
}

/**
 * Get cached rankings
 */
async function getCachedRankings() {
    return get('rankings:latest');
}

/**
 * Cache token prices (short TTL)
 */
async function cacheTokenPrices(chain, data, ttlSeconds = 15) {
    return set(`prices:${chain}`, data, ttlSeconds);
}

/**
 * Get cached token prices
 */
async function getCachedTokenPrices(chain) {
    return get(`prices:${chain}`);
}

/**
 * Cache whale alerts (medium TTL)
 */
async function cacheWhaleAlert(data, ttlSeconds = 60) {
    return set('whales:latest', data, ttlSeconds);
}

/**
 * Get cached whale alerts
 */
async function getCachedWhaleAlerts() {
    return get('whales:latest');
}

/**
 * Cache opportunity findings (short TTL for HFT)
 */
async function cacheOpportunity(key, data, ttlSeconds = 10) {
    return set(`opp:${key}`, data, ttlSeconds);
}

/**
 * Get cached opportunity
 */
async function getCachedOpportunity(key) {
    return get(`opp:${key}`);
}

/**
 * Rate limit check using Redis
 * Returns true if request should be rate limited
 */
async function isRateLimited(key, limit, windowSeconds) {
    const client = await getRedisClient();
    if (!client) return false;

    try {
        const current = await client.incr(key);
        if (current === 1) {
            await client.expire(key, windowSeconds);
        }
        return current > limit;
    } catch (error) {
        return false; // Fail open
    }
}

module.exports = {
    getRedisClient,
    checkConnection,
    disconnect,
    get,
    set,
    del,
    exists,
    cacheRankings,
    getCachedRankings,
    cacheTokenPrices,
    getCachedTokenPrices,
    cacheWhaleAlert,
    getCachedWhaleAlerts,
    cacheOpportunity,
    getCachedOpportunity,
    isRateLimited,
};
