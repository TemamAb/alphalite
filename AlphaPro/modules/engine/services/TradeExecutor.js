/**
 * Trade Executor Service
 * Handles the actual on-chain execution of trades using ERC-4337 Account Abstraction.
 * Integrates with Pimlico for bundling and paymaster services (gasless transactions).
 * Updated for ethers v6 compatibility.
 */
const { ethers } = require('ethers');
const { Client, Presets } = require('userop');
const gasPriceOracle = require('./GasPriceOracle');

// Configuration
const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY;
const CHAIN_ID = process.env.CHAIN_ID || 1;
const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

// Helper: create provider compatible with ethers v5 or v6
function createProvider(rpcUrl) {
    const url = rpcUrl || process.env.ETH_RPC_URL || 'https://ethereum.publicnode.com';
    if (ethers.JsonRpcProvider) {
        // ethers v6
        return new ethers.JsonRpcProvider(url);
    } else if (ethers.providers && ethers.providers.JsonRpcProvider) {
        // ethers v5
        return new ethers.providers.JsonRpcProvider(url);
    }
    throw new Error('Cannot find JsonRpcProvider in ethers');
}

// Helper: parse units (v5/v6 compat)
function parseUnits(value, unit) {
    if (ethers.parseUnits) return ethers.parseUnits(String(value), unit);
    return ethers.utils.parseUnits(String(value), unit);
}

function parseEther(value) {
    if (ethers.parseEther) return ethers.parseEther(String(value));
    return ethers.utils.parseEther(String(value));
}

// Helper: get AddressZero compat
function getZeroAddress() {
    if (ethers.ZeroAddress) return ethers.ZeroAddress;
    return ethers.constants.AddressZero;
}

class TradeExecutor {
    constructor() {
        try {
            this.provider = createProvider();
        } catch (e) {
            console.warn('[EXECUTOR] Provider init failed:', e.message);
            this.provider = null;
        }

        // Pimlico Endpoints
        this.bundlerUrl = `https://api.pimlico.io/v1/${CHAIN_ID}/rpc?apikey=${PIMLICO_API_KEY}`;
        this.paymasterUrl = `https://api.pimlico.io/v2/${CHAIN_ID}/rpc?apikey=${PIMLICO_API_KEY}`;

        // Only create signing wallet if private key is configured
        if (process.env.PRIVATE_KEY && this.provider) {
            try {
                this.signingWallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            } catch (e) {
                console.warn('[EXECUTOR] Wallet init failed:', e.message);
                this.signingWallet = null;
            }
        }

        this.smartAccountAddress = process.env.WALLET_ADDRESS;

        if (PIMLICO_API_KEY && this.signingWallet) {
            this.paymaster = Presets.Middleware.verifyingPaymaster(this.paymasterUrl, {});
            console.log('[EXECUTOR] ✅ Initialized with Pimlico ERC-4337 Bundler (Gasless Mode)');
        } else {
            this.paymaster = null;
            console.log('[EXECUTOR] ⚠️ Running in monitoring mode — no private key or Pimlico key');
        }
    }

    /**
     * Execute a trade opportunity on-chain
     */
    async execute(opportunity, capitalAmount) {
        if (!this.signingWallet || !PIMLICO_API_KEY) {
            console.log('[EXECUTOR] Simulation mode — not executing live trade (no keys configured)');
            return { success: false, reason: 'MONITORING_ONLY' };
        }

        console.log(`[EXECUTOR] 🚀 Preparing execution for ${opportunity.pair} on ${opportunity.chainId}`);

        const profitEth = parseFloat(opportunity.profit || '0');
        const { maxFeePerGas, maxPriorityFeePerGas, bribeEth } = await gasPriceOracle.getGasFees(profitEth, opportunity.strategy);

        if (parseFloat(bribeEth) > 0) {
            console.log(`[EXECUTOR] 💸 Miner Bribe: ${bribeEth} ETH (${opportunity.strategy?.name})`);
        }

        try {
            const smartAccount = await Presets.Builder.SimpleAccount.init(
                this.signingWallet,
                this.bundlerUrl,
                {
                    entryPoint: ENTRY_POINT_ADDRESS,
                    paymasterMiddleware: this.paymaster,
                    overrideBundlerRpc: this.bundlerUrl,
                    maxFeePerGas,
                    maxPriorityFeePerGas
                }
            );

            const callData = this.encodeTradeCallData(opportunity, capitalAmount);
            const client = await Client.init(this.bundlerUrl, { entryPoint: ENTRY_POINT_ADDRESS });

            const result = await client.sendUserOperation(
                smartAccount.execute(this.smartAccountAddress, 0, callData),
                { onBuild: (op) => console.log('[EXECUTOR] UserOp built:', JSON.stringify(op).slice(0, 100)) }
            );

            console.log(`[EXECUTOR] 🎯 Trade Submitted! UserOp Hash: ${result.userOpHash}`);
            const receipt = await result.wait();

            return {
                success: receipt.success,
                hash: receipt.receipt?.transactionHash,
                gasUsed: receipt.actualGasCost,
                blockNumber: receipt.receipt?.blockNumber,
                bribePaid: bribeEth
            };
        } catch (error) {
            console.error('[EXECUTOR] Execution Failed:', error.message);
            throw error;
        }
    }

    encodeTradeCallData(opportunity, capitalAmount) {
        const iface = new ethers.Interface
            ? new ethers.Interface(["function executeArbitrage(address tokenIn, address tokenOut, uint256 amount, address[] path, uint256 minProfit)"])
            : new ethers.utils.Interface(["function executeArbitrage(address tokenIn, address tokenOut, uint256 amount, address[] path, uint256 minProfit)"]);

        const amountWei = parseUnits((capitalAmount * 1000000).toString(), 18);
        const zero = getZeroAddress();

        return iface.encodeFunctionData("executeArbitrage", [
            opportunity.tokenIn || zero,
            opportunity.tokenOut || zero,
            amountWei,
            opportunity.path || [],
            parseUnits("0", 18)
        ]);
    }
}

module.exports = new TradeExecutor();