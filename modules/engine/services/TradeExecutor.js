/**
 * Trade Executor Service
 * Handles the actual on-chain execution of trades using ERC-4337 Account Abstraction.
 * Integrates with Pimlico for bundling and paymaster services (gasless transactions).
 * Updated for ethers v6 compatibility.
 */
const { ethers } = require('ethers');
const { Client, Presets } = require('userop');
const gasPriceOracle = require('./GasPriceOracle');
const configService = require('../../../config/configService');

// Configuration
const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY;
const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

function createProvider(rpcUrl, chainName) {
    const url = rpcUrl || configService.getConfig().rpcUrls[chainName];
    if (!url) throw new Error(`[EXECUTOR] Missing RPC URL for chain: ${chainName}`);
    if (ethers.JsonRpcProvider) {
        // ethers v6
        return new ethers.JsonRpcProvider(url);
    } else if (ethers.providers && ethers.providers.JsonRpcProvider) {
        // ethers v5
        return new ethers.providers.JsonRpcProvider(url);
    }
    throw new Error('Cannot find JsonRpcProvider in ethers');
}

class TradeExecutor {
    constructor() {
        this.providerCache = new Map();
        this.signerCache = new Map();
        if (PIMLICO_API_KEY && process.env.PRIVATE_KEY) {
            console.log('[EXECUTOR] ✅ Initialized with Pimlico ERC-4337 Bundler (Gasless Mode)');
        } else {
            console.log('[EXECUTOR] ⚠️ Running in monitoring mode — no private key or Pimlico key');
        }
    }

    /**
     * Execute a trade opportunity on-chain
     * @param {object} opportunity - The opportunity object from the engine.
     * It MUST contain chainId, target, data, and value.
     */
    async execute(opportunity) {
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey || !PIMLICO_API_KEY) {
            console.log('[EXECUTOR] Simulation mode — not executing live trade (no keys configured)');
            return { success: false, reason: 'MONITORING_ONLY' };
        }

        const { chainId, target, data, value, pair, strategy } = opportunity;
        if (!chainId || !target || !data) {
            throw new Error('[EXECUTOR] Invalid opportunity object. Missing chainId, target, or data.');
        }

        console.log(`[EXECUTOR] 🚀 Preparing execution for ${pair} on chain ${chainId}`);

        const profitEth = parseFloat(opportunity.profit || '0');
        const { maxFeePerGas, maxPriorityFeePerGas, bribeEth } = await gasPriceOracle.getGasFees(profitEth, strategy);

        if (parseFloat(bribeEth) > 0) {
            console.log(`[EXECUTOR] 💸 Miner Bribe: ${bribeEth} ETH (${strategy?.name})`);
        }

        try {
            // Dynamically create provider and signer for the correct chain
            const provider = createProvider(null, chainId);
            const signingWallet = new ethers.Wallet(privateKey, provider);

            const bundlerUrl = `https://api.pimlico.io/v1/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`;
            const paymasterUrl = `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`;
            const paymaster = Presets.Middleware.verifyingPaymaster(paymasterUrl, {});

            const smartAccount = await Presets.Builder.SimpleAccount.init(
                signingWallet,
                bundlerUrl,
                {
                    entryPoint: ENTRY_POINT_ADDRESS,
                    paymasterMiddleware: paymaster,
                    overrideBundlerRpc: bundlerUrl,
                    maxFeePerGas,
                    maxPriorityFeePerGas
                }
            );

            const client = await Client.init(bundlerUrl, { entryPoint: ENTRY_POINT_ADDRESS });

            // **FIX:** Use the pre-built calldata from the engine
            const result = await client.sendUserOperation(
                smartAccount.execute(target, value || 0, data),
                { onBuild: (op) => console.log('[EXECUTOR] UserOp built:', JSON.stringify(op).slice(0, 100)) }
            );

            console.log(`[EXECUTOR] 🎯 Trade Submitted! UserOp Hash: ${result.userOpHash}`);
            const receipt = await result.wait();
            const success = receipt.success === 'true' || receipt.success === true;

            return {
                success: success,
                transactionHash: receipt.receipt?.transactionHash,
                gasUsed: receipt.actualGasCost,
                blockNumber: receipt.receipt?.blockNumber,
                bribePaid: bribeEth
            };
        } catch (error) {
            console.error('[EXECUTOR] Execution Failed:', error.message);
            // Add more context to the error
            error.message = `Execution on chain ${chainId} failed: ${error.message}`;
            throw error;
        }
    }
}

module.exports = new TradeExecutor();