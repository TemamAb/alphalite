const { ethers } = require('ethers');

async function checkBalance() {
    const address = '0x748Aa8ee067585F5bd02f0988eF6E71f2d662751';
    const rpc = 'https://ethereum.publicnode.com';
    const provider = new ethers.providers.JsonRpcProvider(rpc);

    try {
        const balance = await provider.getBalance(address);
        console.log(`Balance for ${address}: ${ethers.utils.formatEther(balance)} ETH`);
    } catch (error) {
        console.error('Error fetching balance:', error.message);
    }
}

checkBalance();
