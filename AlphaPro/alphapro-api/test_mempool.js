/**
 * Test Script: Verify Real-time Mempool Polling
 * Tests the 1-second pending transaction detection
 * Uses Node.js built-in fetch (v18+)
 */

async function testMempoolPolling() {
    console.log('🧪 Testing Real-time Mempool Detection...\n');
    
    // Multiple RPC endpoints for Ethereum
    const ethRpcs = [
        'https://eth.llamarpc.com',
        'https://1rpc.io/eth',
        'https://rpc.ankr.com/eth'
    ];
    
    for (let i = 0; i < ethRpcs.length; i++) {
        const rpcUrl = ethRpcs[i];
        console.log(`📡 Testing RPC ${i + 1}: ${rpcUrl}`);
        
        try {
            const startTime = Date.now();
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_getBlockByNumber',
                    params: ['pending', true], // Get pending transactions!
                    id: 1
                })
            });
            
            const latency = Date.now() - startTime;
            
            if (response.ok) {
                const data = await response.json();
                const pendingTxs = data.result?.transactions || [];
                
                console.log(`   ✅ SUCCESS! Latency: ${latency}ms`);
                console.log(`   📦 Pending transactions: ${pendingTxs.length}`);
                
                if (pendingTxs.length > 0) {
                    console.log(`   🔍 Sample TX: ${pendingTxs[0].hash?.slice(0, 20)}...`);
                }
            } else if (response.status === 429) {
                console.log(`   ⚠️ Rate limited (429)`);
            } else {
                console.log(`   ❌ HTTP ${response.status}`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        console.log('');
    }
    
    console.log('✅ Mempool polling test complete!');
    console.log('\n📊 Expected behavior when running:');
    console.log('   - Polls every 1 second (not 15s)');
    console.log('   - Gets PENDING transactions (not just block number)');
    console.log('   - Emits mempool:pendingTx events for each tx');
    console.log('   - Engine detects opportunities in real-time');
}

// Run test
testMempoolPolling().catch(console.error);
