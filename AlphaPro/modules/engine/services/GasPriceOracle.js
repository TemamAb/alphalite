/**
 * Gas Price Oracle
 * Dynamically fetches and calculates optimal gas fees for UserOperations.
 * Ensures transactions are priced competitively for HFT execution.
 */
const { ethers } = require('ethers');

class GasPriceOracle {
    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(process.env.ETH_RPC_URL);
    }

    /**
     * Get optimal gas fees for a high-priority UserOperation
     * @param {number} expectedProfitEth - The expected profit in ETH
     * @param {object} strategy - The strategy object { name, risk }
     * @returns {Promise<{maxFeePerGas: BigNumber, maxPriorityFeePerGas: BigNumber, bribeEth: string}>}
     */
    async getGasFees(expectedProfitEth = 0, strategy = { name: 'Unknown', risk: 'Medium' }) {
        try {
            const feeData = await this.provider.getFeeData();
            
            // Default fallback values if provider fails to return data
            let maxFeePerGas = feeData.maxFeePerGas || ethers.utils.parseUnits('30', 'gwei');
            let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.utils.parseUnits('1.5', 'gwei');

            // --- STRATEGIC BIDDING LOGIC ---
            
            // 1. Baseline HFT Multiplier (Ensure we are above the floor)
            const baseMultiplier = 120; // 1.2x
            maxFeePerGas = maxFeePerGas.mul(baseMultiplier).div(100);
            maxPriorityFeePerGas = maxPriorityFeePerGas.mul(baseMultiplier).div(100);

            // 2. Profit-Sharing Bribe Calculation (The "Winner's Edge")
            // If the trade is profitable, we share a % with the miner/bundler to guarantee inclusion.
            let bribeEth = '0';
            
            if (expectedProfitEth > 0.001) { // Only bribe if profit is meaningful (> $2-3)
                // Get bribe share % from the config service (checks for overrides)
                const bribeSharePercent = bribeConfigService.getBribeShare(strategy.name, strategy.risk);
                const bribeShare = bribeSharePercent / 100;

                // Calculate bribe amount in ETH
                const bribeAmount = expectedProfitEth * bribeShare;
                bribeEth = bribeAmount.toFixed(6);

                // Convert bribe to Gas Price (Priority Fee)
                // Assuming an average gas limit of 300,000 for an arb trade
                const estimatedGasLimit = 300000;
                const bribeWei = ethers.utils.parseEther(bribeAmount.toFixed(18));
                const bribePerGas = bribeWei.div(estimatedGasLimit);

                // Add bribe to priority fee
                maxPriorityFeePerGas = maxPriorityFeePerGas.add(bribePerGas);
                
                // Ensure maxFeePerGas is high enough to cover the new priority fee + base fee
                if (maxFeePerGas.lt(maxPriorityFeePerGas.add(feeData.lastBaseFeePerGas || 0))) {
                    maxFeePerGas = maxPriorityFeePerGas.add(feeData.lastBaseFeePerGas || 0).mul(120).div(100);
                }
            }

            return {
                maxFeePerGas,
                maxPriorityFeePerGas,
                bribeEth
            };
        } catch (error) {
            console.warn('[ORACLE] Failed to fetch gas fees, using safe defaults:', error.message);
            // Return safe defaults for Mainnet
            return {
                maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
                maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
                bribeEth: '0'
            };
        }
    }
}

module.exports = new GasPriceOracle();