/**
 * check_balance.js - Utility to check wallet balance
 * Usage: node check_balance.js [address] [rpc_url]
 * Or set environment variables WALLET_ADDRESS and RPC_URL
 */

const { ethers } = require('ethers');

async function checkBalance() {
    // Use command line args, environment variables, or defaults
    const address = process.argv[2] || process.env.WALLET_ADDRESS || '0x748Aa8ee067585F5bd02f0988eF6E71f2d662751';
    const rpc = process.argv[3] || process.env.RPC_URL || process.env.RPC || 'https://ethereum.publicnode.com';

    if (!address || !ethers.isAddress(address)) {
        console.error('Invalid Ethereum address provided');
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(rpc);

    try {
        const balance = await provider.getBalance(address);
        console.log(`Balance for ${address}: ${ethers.formatEther(balance)} ETH`);
        
        // Also get chain ID for confirmation
        const network = await provider.getNetwork();
        console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
    } catch (error) {
        console.error('Error fetching balance:', error.message);
        process.exit(1);
    }
}

checkBalance();
