/**
 * Enterprise Redis Cache Service
 * 
 * Provides distributed caching with:
 * - Connection pooling
 * - Automatic retry logic
 * - Cache invalidation patterns
 * - Rate limiting support
 */

const redis = require('redis');

class CacheService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.retryStrategy = null;
    }
    
    /**
     * Initialize Redis connection
     */
    async connect() {
        if (this.isConnected) {
            return this.client;
        }
        
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        
        this.client = redis.createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('[CACHE] Max reconnection attempts reached');
                        return new Error('Max Redis reconnection attempts reached');
                    }
                    // Exponential backoff
                    return Math.min(retries * 100, 3000);
                }
            },
            legacyMode: false
        });
        
        this.client.on('error', (err) => {
            console.error('[CACHE] Redis error:', err.message);
            this.isConnected = false;
        });
        
        this.client.on('connect', () => {
            console.log('[CACHE] Connected to Redis');
            this.isConnected = true;
        });
        
        this.client.on('ready', () => {
            this.isConnected = true;
        });
        
        this.client.on('reconnecting', () => {
            console.log('[CACHE] Reconnecting to Redis...');
        });
        
        await this.client.connect();
        return this.client;
    }
    
    /**
     * Disconnect from Redis
     */
    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.isConnected = false;
            console.log('[CACHE] Disconnected from Redis');
        }
    }
    
    // =====================================================
    // BASIC CACHE OPERATIONS
    // =====================================================
    
    /**
     * Set value with optional expiration
     */
    async set(key, value, ttlSeconds = 3600) {
        if (!this.isConnected) await this.connect();
        
        const serialized = typeof value === 'string' 
            ? value 
            : JSON.stringify(value);
        
        if (ttlSeconds > 0) {
            await this.client.setEx(key, ttlSeconds, serialized);
        } else {
            await this.client.set(key, serialized);
        }
    }
    
    /**
     * Get value
     */
    async get(key) {
        if (!this.isConnected) await this.connect();
        
        const value = await this.client.get(key);
        
        if (value === null) return null;
        
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    
    /**
     * Delete key
     */
    async del(key) {
        if (!this.isConnected) await this.connect();
        return await this.client.del(key);
    }
    
    /**
     * Check if key exists
     */
    async exists(key) {
        if (!this.isConnected) await this.connect();
        return await this.client.exists(key);
    }
    
    /**
     * Set expiration
     */
    async expire(key, ttlSeconds) {
        if (!this.isConnected) await this.connect();
        return await this.client.expire(key, ttlSeconds);
    }
    
    /**
     * Get TTL
     */
    async ttl(key) {
        if (!this.isConnected) await this.connect();
        return await this.client.ttl(key);
    }
    
    // =====================================================
    // CACHE INVALIDATION
    // =====================================================
    
    /**
     * Delete by pattern (use carefully in production)
     */
    async deleteByPattern(pattern) {
        if (!this.isConnected) await this.connect();
        
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
            return await this.client.del(keys);
        }
        return 0;
    }
    
    /**
     * Invalidate cache tags (using set-based approach)
     */
    async invalidateTag(tag) {
        // Store tags in a set
        const tagKey = `cache_tag:${tag}`;
        const cachedKeys = await this.client.sMembers(tagKey);
        
        if (cachedKeys.length > 0) {
            await this.client.del(cachedKeys);
        }
        
        // Delete the tag set itself
        await this.client.del(tagKey);
    }
    
    /**
     * Add key to tag
     */
    async tagKey(key, tag) {
        const tagKey = `cache_tag:${tag}`;
        await this.client.sAdd(tagKey, key);
        // Set tag expiry to match longest cache duration
        await this.client.expire(tagKey, 86400); // 24 hours
    }
    
    // =====================================================
    // RATE LIMITING
    // =====================================================
    
    /**
     * Simple rate limiter using sliding window
     */
    async rateLimit(key, maxRequests, windowSeconds) {
        if (!this.isConnected) await this.connect();
        
        const now = Date.now();
        const windowStart = now - (windowSeconds * 1000);
        
        // Use sorted set with timestamps as scores
        const rateKey = `ratelimit:${key}`;
        
        // Remove old entries
        await this.client.zRemRangeByScore(rateKey, 0, windowStart);
        
        // Count current requests
        const currentCount = await this.client.zCard(rateKey);
        
        if (currentCount >= maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: windowStart + (windowSeconds * 1000)
            };
        }
        
        // Add new request
        await this.client.zAdd(rateKey, { score: now, value: now.toString() });
        await this.client.expire(rateKey, windowSeconds);
        
        return {
            allowed: true,
            remaining: maxRequests - currentCount - 1,
            resetAt: now + (windowSeconds * 1000)
        };
    }
    
    // =====================================================
    // DISTRIBUTED LOCKING
    // =====================================================
    
    /**
     * Acquire distributed lock
     */
    async acquireLock(key, ttlSeconds = 10) {
        if (!this.isConnected) await this.connect();
        
        const lockKey = `lock:${key}`;
        const lockValue = Date.now().toString();
        
        // Try to set lock with NX (only if not exists)
        const acquired = await this.client.set(lockKey, lockValue, {
            NX: true,
            PX: ttlSeconds * 1000
        });
        
        return acquired ? lockValue : null;
    }
    
    /**
     * Release distributed lock
     */
    async releaseLock(key, lockValue) {
        if (!this.isConnected) await this.connect();
        
        const lockKey = `lock:${key}`;
        
        // Only release if we own the lock
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        
        return await this.client.eval(script, { keys: [lockKey], arguments: [lockValue] });
    }
    
    // =====================================================
    // CACHE HELPERS
    // =====================================================
    
    /**
     * Cache with automatic refresh
     */
    async cacheWithRefresh(key, fetchFn, ttlSeconds = 60) {
        const cached = await this.get(key);
        
        if (cached !== null) {
            return cached;
        }
        
        const fresh = await fetchFn();
        await this.set(key, fresh, ttlSeconds);
        return fresh;
    }
    
    /**
     * Warm cache on startup
     */
    async warmCache(items, keyFn, fetchFn, ttlSeconds = 300) {
        const pipeline = this.client.multi();
        
        for (const item of items) {
            const key = keyFn(item);
            const value = await fetchFn(item);
            pipeline.setEx(key, ttlSeconds, JSON.stringify(value));
        }
        
        return await pipeline.exec();
    }
}

module.exports = new CacheService();
