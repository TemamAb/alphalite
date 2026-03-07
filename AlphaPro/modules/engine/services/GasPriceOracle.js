/**
 * Gas Price Oracle
 * Dynamically fetches and calculates optimal gas fees for UserOperations.
 * Uses ethers v5 compatible API.
 */
const { ethers } = require('ethers');

// Lazy-load bribeConfigService to avoid circular dependency
let bribeConfigService;
function getBribeConfig() {
    if (!bribeConfigService) {
        try { bribeConfigService = require('./BribeConfigService'); }
        catch (e) { bribeConfigService = { getBribeShare: () => 5 }; }
    }
    return bribeConfigService;
}

class GasPriceOracle {
    constructor() {
        try {
            const rpcUrl = process.env.ETH_RPC_URL || 'https://ethereum.publicnode.com';
            this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        } catch (e) {
            console.warn('[ORACLE] Provider init failed:', e.message);
            this.provider = null;
        }
    }

    async getGasFees(expectedProfitEth = 0, strategy = { name: 'Unknown', risk: 'Medium' }) {
        try {
            if (!this.provider) throw new Error('No provider');
            const feeData = await this.provider.getFeeData();

            let maxFeePerGas = feeData.maxFeePerGas || ethers.utils.parseUnits('30', 'gwei');
            let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.utils.parseUnits('1.5', 'gwei');

            maxFeePerGas = maxFeePerGas.mul(120).div(100);
            maxPriorityFeePerGas = maxPriorityFeePerGas.mul(120).div(100);

            let bribeEth = '0';
            if (expectedProfitEth > 0.001) {
                const bribeSharePercent = getBribeConfig().getBribeShare(strategy.name, strategy.risk);
                const bribeAmount = expectedProfitEth * (bribeSharePercent / 100);
                bribeEth = bribeAmount.toFixed(6);

                const bribeWei = ethers.utils.parseEther(bribeAmount.toFixed(18));
                const bribePerGas = bribeWei.div(300000);
                maxPriorityFeePerGas = maxPriorityFeePerGas.add(bribePerGas);

                const baseFee = feeData.lastBaseFeePerGas || ethers.BigNumber.from(0);
                if (maxFeePerGas.lt(maxPriorityFeePerGas.add(baseFee))) {
                    maxFeePerGas = maxPriorityFeePerGas.add(baseFee).mul(120).div(100);
                }
            }

            return { maxFeePerGas, maxPriorityFeePerGas, bribeEth };
        } catch (error) {
            console.warn('[ORACLE] Failed to fetch gas fees:', error.message);
            return {
                maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
                maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
                bribeEth: '0'
            };
        }
    }
}

module.exports = new GasPriceOracle();