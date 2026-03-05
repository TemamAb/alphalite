/**
 * Trade Executor Service
 * Handles the actual on-chain execution of trades using ERC-4337 Account Abstraction.
 * Integrates with Pimlico for bundling and paymaster services (gasless transactions).
 */
const { ethers } = require('ethers');
const { Client, Presets } = require('userop');
const gasPriceOracle = require('./GasPriceOracle');

// Configuration
const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY;
const CHAIN_ID = process.env.CHAIN_ID || 1; // Default to Mainnet
const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"; // Standard EntryPoint

class TradeExecutor {
    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(process.env.ETH_RPC_URL);
        
        // Pimlico Endpoints
        this.bundlerUrl = `https://api.pimlico.io/v1/${CHAIN_ID}/rpc?apikey=${PIMLICO_API_KEY}`;
        this.paymasterUrl = `https://api.pimlico.io/v2/${CHAIN_ID}/rpc?apikey=${PIMLICO_API_KEY}`;
        
        // The wallet that will sign the UserOperations
        this.signingWallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

        // The smart contract account address that will execute the trade
        this.smartAccountAddress = process.env.WALLET_ADDRESS;

        // Paymaster middleware to sponsor the transaction (gasless)
        this.paymaster = Presets.Middleware.verifyingPaymaster(this.paymasterUrl, {
            // context for paymaster
        });

        console.log('[EXECUTOR] Initialized with Pimlico Bundler');
    }

    /**
     * Execute a trade opportunity on-chain
     * @param {Object} opportunity - The trade opportunity details
     * @param {Number} capitalAmount - Amount of capital allocated (in millions, need conversion)
     * @returns {Promise<Object>} - Execution result receipt
     */
    async execute(opportunity, capitalAmount) {
        console.log(`[EXECUTOR] Preparing execution for ${opportunity.pair} on ${opportunity.chainId}`);

        // 0. Get dynamic gas fees with Profit-Sharing Bidding
        // We pass the expected profit and risk profile to calculate the optimal bribe
        const profitEth = parseFloat(opportunity.profit || '0');        
        
        const { maxFeePerGas, maxPriorityFeePerGas, bribeEth } = await gasPriceOracle.getGasFees(profitEth, opportunity.strategy);

        if (parseFloat(bribeEth) > 0) {
            if (opportunity.strategy.name === "Leviathan Aggregation") {
                console.log(`[EXECUTOR] 🐋 LEVIATHAN MODE: Aggressive Bribe ${bribeEth} ETH for Multi-Source Flash Loan`);
            } else {
                console.log(`[EXECUTOR] 💸 Bribing Miner: ${bribeEth} ETH to secure block inclusion (Strategy: ${opportunity.strategy.name})`);
            }
        }

        // 1. Initialize the userop.js Client with our bundler and paymaster
        const smartAccount = await Presets.Builder.SimpleAccount.init(this.signingWallet, this.bundlerUrl, {
            entryPoint: ENTRY_POINT_ADDRESS,
            factory: undefined, // Or your account factory address
            paymasterMiddleware: this.paymaster,
            overrideBundlerRpc: this.bundlerUrl,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas
        });

        try {
            // 2. Construct the Call Data for the flash loan + swap
            const callData = this.encodeTradeCallData(opportunity, capitalAmount);

            // 3. Build, sign, and send the UserOperation using the Client
            // The client handles gas estimation, paymaster sponsoring, signing, and submission.
            const client = await Client.init(this.bundlerUrl, { entryPoint: ENTRY_POINT_ADDRESS });
            const result = await client.sendUserOperation(
                smartAccount.execute(this.smartAccountAddress, 0, callData),
                {
                    onBuild: (op) => console.log('[EXECUTOR] UserOp built:', op),
                }
            );
            console.log(`[EXECUTOR] 🚀 Trade Submitted! UserOp Hash: ${result.userOpHash}`);

            // 4. Wait for the transaction to be mined
            const receipt = await result.wait();
            
            return {
                success: receipt.success,
                hash: receipt.receipt.transactionHash,
                gasUsed: receipt.actualGasCost,
                blockNumber: receipt.receipt.blockNumber,
                bribePaid: bribeEth
            };

        } catch (error) {
            console.error('[EXECUTOR] Execution Failed:', error.message);
            throw error;
        }
    }

    // --- Helper Methods ---

    encodeTradeCallData(opportunity, capitalAmount) {
        // ABI for the AlphaPro Arbitrage Contract
        const iface = new ethers.utils.Interface([
            "function executeArbitrage(address tokenIn, address tokenOut, uint256 amount, address[] path, uint256 minProfit)"
        ]);

        // Convert capital (millions) to Wei (assuming 18 decimals for simplicity, real app would check token decimals)
        // Example: 10M -> 10 * 10^6 * 10^18
        const amountWei = ethers.utils.parseUnits((capitalAmount * 1000000).toString(), 18);

        return iface.encodeFunctionData("executeArbitrage", [
            opportunity.tokenIn || ethers.constants.AddressZero,
            opportunity.tokenOut || ethers.constants.AddressZero,
            amountWei,
            opportunity.path || [],
            ethers.utils.parseUnits("0", 18) // Min profit 0 for now, protected by contract logic
        ]);
    }
}

module.exports = new TradeExecutor();