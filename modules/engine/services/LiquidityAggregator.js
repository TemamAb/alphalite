/**
 * Liquidity Aggregator Service
 * Implements "The Leviathan" Strategy: Multi-Source Flash Loan Aggregation.
 * Scans Aave, Balancer, and Uniswap for maximum available liquidity to execute
 * massive ($100M+) trades that competitors miss due to single-source limits.
 */
const rankingEngine = require('./RankingEngine');
const { ethers } = require('ethers');

// Aave V3 Pool addresses for different chains
const AAVE_V3_POOL_ADDRESSES = {
    'ethereum': '0x87870Bca3F3fD603653147BBD339091226211312',
    'arbitrum': '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    'optimism': '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    'polygon': '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    'avalanche': '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
};

// Minimal ABIs
const AAVE_V3_POOL_ABI = ["function getReserveData(address asset) view returns (tuple(uint256,uint128,uint128,uint128,uint128,uint128,uint40,address,address,address,address,uint128,uint128) reserveData)"];
const ATOKEN_ABI = ["function totalSupply() view returns (uint256)", "function UNDERLYING_ASSET_ADDRESS() view returns (address)"];
const ERC20_ABI = ["function decimals() view returns (uint8)"];

class LiquidityAggregator {
    constructor() {
        // Major Flash Loan Providers and their theoretical max capacity (in USD)
        this.providers = [
            { name: 'Aave V3', reliability: 0.99, fee: 0.0009, real: true },
            { name: 'Balancer V2', reliability: 0.98, fee: 0.0, real: false }, // TODO
            { name: 'Uniswap V3', reliability: 0.95, fee: 0.0005, real: false }, // TODO
            { name: 'DODO', reliability: 0.90, fee: 0.0, real: false }, // TODO
            { name: 'MakerDAO', reliability: 0.99, fee: 0.0, real: false } // TODO
        ];
    }

    /**
     * Get total available flash liquidity for a token
     * Queries real on-chain data for implemented providers.
     */
    async getTotalLiquidity(tokenAddress, chainId = 'ethereum') {
        const sources = await Promise.all(this.providers.map(async (p) => {
            let available = 0;
            if (p.real && p.name === 'Aave V3') {
                try {
                    available = await this.getAaveV3Liquidity(tokenAddress, chainId);
                } catch (e) {
                    console.warn(`[LEVIATHAN] Failed to get Aave V3 liquidity: ${e.message}`);
                    available = 0; // Fail safe
                }
            } else {
                // For non-implemented providers, return 0 to avoid simulation.
                available = 0;
            }
            return { ...p, available };
        }));

        const total = sources.reduce((sum, s) => sum + s.available, 0);
        return { total, sources, token: tokenAddress, timestamp: Date.now() };
    }

    async getAaveV3Liquidity(tokenAddress, chainId) {
        const rpcUrl = rankingEngine.config.rpcUrls?.[chainId];
        const poolAddress = AAVE_V3_POOL_ADDRESSES[chainId];

        if (!rpcUrl || !poolAddress) return 0;

        try {
            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            const poolContract = new ethers.Contract(poolAddress, AAVE_V3_POOL_ABI, provider);
            const reserveData = await poolContract.getReserveData(tokenAddress);
            
            const aTokenAddress = reserveData[7]; 
            const aTokenContract = new ethers.Contract(aTokenAddress, ATOKEN_ABI, provider);
            
            const underlyingAssetAddress = await aTokenContract.UNDERLYING_ASSET_ADDRESS();
            const tokenContract = new ethers.Contract(underlyingAssetAddress, ERC20_ABI, provider);

            const [totalSupply, decimals] = await Promise.all([
                aTokenContract.totalSupply(),
                tokenContract.decimals()
            ]);

            const formattedTotalSupply = parseFloat(ethers.utils.formatUnits(totalSupply, decimals));
            const tokenPrice = rankingEngine.getPairData(chainId, tokenAddress)?.priceUsd || 1;
            
            return formattedTotalSupply * tokenPrice;
        } catch (error) {
            console.warn(`[LEVIATHAN] Aave V3 query for ${tokenAddress} on ${chainId} failed: ${error.message}`);
            return 0; // Return 0 on failure, no simulation
        }
    }
}

module.exports = new LiquidityAggregator();