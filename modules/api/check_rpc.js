/**
 * check_rpc.js - Utility to check RPC endpoint availability
 * Usage: node check_rpc.js
 * Or set environment variable RPC_URLS (comma-separated)
 */

const https = require('https');

// Default RPC endpoints (fallback if env not set)
const defaultRpcs = [
    'https://eth-mainnet.public.blastapi.io',
    'https://ethereum.publicnode.com',
    'https://1rpc.io/eth',
    'https://rpc.flashbots.net',
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://cloudflare-eth.com'
];

// Get RPC URLs from environment or use defaults
const rpcs = process.env.RPC_URLS 
    ? process.env.RPC_URLS.split(',').map(url => url.trim())
    : defaultRpcs;

async function checkRpc(url) {
    return new Promise((resolve) => {
        console.log(`Checking ${url}...`);
        const data = JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1
        });

        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            },
            timeout: 5000
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log(`SUCCESS [${res.statusCode}] ${url}: ${body.substring(0, 100)}`);
                resolve(true);
            });
        });

        req.on('error', (e) => {
            console.log(`FAILED ${url}: ${e.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`TIMEOUT ${url}`);
            req.destroy();
            resolve(false);
        });

        req.write(data);
        req.end();
    });
}

async function run() {
    console.log('=== RPC Endpoint Health Check ===\n');
    for (const rpc of rpcs) {
        await checkRpc(rpc);
    }
    console.log('\n=== Check Complete ===');
}

run();
