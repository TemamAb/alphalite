
const ethers = require('ethers');

async function test() {
    console.log('Testing Ethers v5 connection to BlastAPI...');
    try {
        const url = 'https://eth-mainnet.public.blastapi.io';
        const provider = new ethers.providers.JsonRpcProvider(url);

        console.log('Fetching network...');
        const network = await provider.getNetwork();
        console.log('Network detected:', network);

        const block = await provider.getBlockNumber();
        console.log('Current block:', block);

        console.log('✅ Connection successful!');
    } catch (e) {
        console.error('❌ Connection failed:', e.message);
        if (e.reason) console.error('Reason:', e.reason);
        if (e.code) console.error('Code:', e.code);
    }
}

test();
