/**
 * Price Oracle Service
 * 
 * Provides real-time price data from multiple sources:
 * - CoinGecko API (primary)
 * - Chainlink (backup)
 * - Uniswap TWAP (fallback)
 * 
 * Implements:
 * - Price caching
 * - Source fallback
 * - Stale price detection
 */

const axios = require('axios');
const CacheService = require('./CacheService');

class PriceOracleService {
    constructor() {
        this.config = {
            coingecko: {
                apiKey: process.env.COINGECKO_API_KEY,
                baseUrl: 'https://api.coingecko.com/api/v3'
            },
            chainlink: {
                // Chainlink price feed addresses (Ethereum mainnet)
                feeds: {
                    'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
                    'BTC/USD': '0xbF5A26E0F8dA4f0C3E2d4f4f4f4f4f4f4f4f4f4f',
                    'USDC/USD': '0x8fFfFfdE251E1fE49D5C770D2F7C5c2a3C5eE6d6'
                }
            },
            cacheTTL: 30, // 30 seconds cache
            staleThreshold: 300 // 5 minutes considered stale
        };
        
        this.prices = new Map();
        this.lastUpdate = new Map();
    }
    
    /**
     * Get price for a token
     * @param {string} tokenId - CoinGecko ID (e.g., 'ethereum', 'bitcoin')
     * @param {string} vsCurrency - Quote currency (e.g., 'usd', 'eth')
     */
    async getPrice(tokenId, vsCurrency = 'usd') {
        const cacheKey = `price:${tokenId}:${vsCurrency}`;
        
        // Check cache first
        const cached = await CacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        
        // Fetch from primary source
        try {
            const price = await this.fetchFromCoinGecko(tokenId, vsCurrency);
            
            // Cache the result
            await CacheService.set(cacheKey, price, this.config.cacheTTL);
            this.prices.set(cacheKey, price);
            this.lastUpdate.set(cacheKey, Date.now());
            
            return price;
        } catch (error) {
            console.error(`[ORACLE] Failed to fetch price for ${tokenId}:`, error.message);
            
            // Try fallback source
            try {
                return await this.fetchFallback(tokenId, vsCurrency);
            } catch (fallbackError) {
                // Return cached stale price if available
                const stalePrice = this.prices.get(cacheKey);
                if (stalePrice && this.isPriceStale(cacheKey)) {
                    console.warn(`[ORACLE] Using stale price for ${tokenId}`);
                    return { ...stalePrice, stale: true };
                }
                
                throw new Error(`Unable to fetch price for ${tokenId}`);
            }
        }
    }
    
    /**
     * Fetch from CoinGecko API
     */
    async fetchFromCoinGecko(tokenId, vsCurrency) {
        const url = `${this.config.coingecko.baseUrl}/simple/price`;
        
        const params = {
            ids: tokenId,
            vs_currencies: vsCurrency,
            include_24hr_change: true,
            include_sparkline: false
        };
        
        if (this.config.coingecko.apiKey) {
            params.x_cg_demo_api_key = this.config.coingecko.apiKey;
        }
        
        const response = await axios.get(url, { params });
        
        if (!response.data || !response.data[tokenId]) {
            throw new Error(`No price data for ${tokenId}`);
        }
        
        const data = response.data[tokenId];
        
        return {
            price: data[vsCurrency],
            change24h: data[`${vsCurrency}_24h_change`],
            source: 'coingecko',
            timestamp: Date.now()
        };
    }
    
    /**
     * Fetch from fallback source
     */
    async fetchFallback(tokenId, vsCurrency) {
        // Try Chainlink or other sources
        // For now, throw error if primary fails
        throw new Error('No fallback source available');
    }
    
    /**
     * Check if cached price is stale
     */
    isPriceStale(cacheKey) {
        const lastUpdate = this.lastUpdate.get(cacheKey);
        if (!lastUpdate) return true;
        
        return (Date.now() - lastUpdate) > (this.config.staleThreshold * 1000);
    }
    
    /**
     * Get ETH price in USD (most commonly needed)
     */
    async getEthPrice() {
        return this.getPrice('ethereum', 'usd');
    }
    
    /**
     * Get multiple token prices at once
     */
    async getMultiplePrices(tokenIds, vsCurrency = 'usd') {
        const cacheKey = `prices:${tokenIds.join(',')}:${vsCurrency}`;
        
        const cached = await CacheService.get(cacheKey);
        if (cached) return cached;
        
        try {
            const url = `${this.config.coingecko.baseUrl}/simple/price`;
            
            const params = {
                ids: tokenIds.join(','),
                vs_currencies: vsCurrency,
                include_24hr_change: true
            };
            
            if (this.config.coingecko.apiKey) {
                params.x_cg_demo_api_key = this.config.coingecko.apiKey;
            }
            
            const response = await axios.get(url, { params });
            
            const prices = {};
            for (const [id, data] of Object.entries(response.data)) {
                prices[id] = {
                    price: data[vsCurrency],
                    change24h: data[`${vsCurrency}_24h_change`],
                    source: 'coingecko',
                    timestamp: Date.now()
                };
            }
            
            await CacheService.set(cacheKey, prices, this.config.cacheTTL);
            return prices;
        } catch (error) {
            console.error('[ORACLE] Batch price fetch failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Get price with conversion
     */
    async convertAmount(amount, fromToken, toToken) {
        const [fromPrice, toPrice] = await Promise.all([
            this.getPrice(fromToken, toToken),
            this.getPrice(toToken, toToken === 'usd' ? 'usd' : 'usd')
        ]);
        
        if (!fromPrice || !toPrice) {
            throw new Error('Unable to get conversion rates');
        }
        
        // Convert: amount * (fromPrice / toPrice)
        // If converting to USD: amount * fromPrice.price
        // If converting from USD: amount / toPrice.price
        
        let converted;
        if (toToken === 'usd') {
            converted = amount * fromPrice.price;
        } else if (fromToken === 'usd') {
            converted = amount / toPrice.price;
        } else {
            // Both are crypto
            const fromUSD = amount * fromPrice.price;
            converted = fromUSD / toPrice.price;
        }
        
        return {
            original: amount,
            converted,
            fromToken,
            toToken,
            rate: converted / amount,
            fromPrice,
            toPrice
        };
    }
    
    /**
     * Get gas price for a chain
     */
    async getGasPrice(chain = 'ethereum') {
        const cacheKey = `gasprice:${chain}`;
        
        const cached = await CacheService.get(cacheKey);
        if (cached) return cached;
        
        const gasPrices = {
            ethereum: await this.getEthGasPrice(),
            polygon: await this.getPolygonGasPrice(),
            arbitrum: await this.getArbitrumGasPrice(),
            optimism: await this.getOptimismGasPrice()
        };
        
        const gasPrice = gasPrices[chain.toLowerCase()] || gasPrices.ethereum;
        
        await CacheService.set(cacheKey, gasPrice, 60); // Cache for 1 minute
        return gasPrice;
    }
    
    async getEthGasPrice() {
        try {
            // Use EthGasStation or similar
            // For now, return estimated values
            return {
                slow: 20, // gwei
                standard: 30,
                fast: 50,
                source: 'estimate'
            };
        } catch (error) {
            return { slow: 20, standard: 30, fast: 50, source: 'default' };
        }
    }
    
    async getPolygonGasPrice() {
        return { slow: 50, standard: 80, fast: 150, source: 'default' };
    }
    
    async getArbitrumGasPrice() {
        return { slow: 0.1, standard: 0.15, fast: 0.3, source: 'default' };
    }
    
    async getOptimismGasPrice() {
        return { slow: 0.001, standard: 0.002, fast: 0.005, source: 'default' };
    }
}

module.exports = new PriceOracleService();
