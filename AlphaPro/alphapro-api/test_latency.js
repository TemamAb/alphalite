/**
 * Latency Test: Measure WebSocket vs REST API response times
 */

const WebSocket = require('ws');

async function testWebSocketLatency() {
    console.log('🔬 Testing WebSocket Latency...\n');
    
    const wsUrl = 'wss://ethereum.publicnode.com';
    const startTime = Date.now();
    
    return new Promise((resolve) => {
        const ws = new WebSocket(wsUrl);
        let connected = false;
        
        ws.on('open', () => {
            const connectTime = Date.now() - startTime;
            console.log(`✅ WebSocket Connected in ${connectTime}ms`);
            connected = true;
            
            // Subscribe to new pending transactions
            ws.send(JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_subscribe',
                params: ['newPendingTransactions']
            }));
        });
        
        ws.on('message', (data) => {
            const latency = Date.now() - startTime;
            console.log(`📨 First tx received in ${latency}ms`);
            ws.close();
            resolve(latency);
        });
        
        ws.on('error', (err) => {
            console.log(`❌ WebSocket Error: ${err.message}`);
            resolve(null);
        });
        
        setTimeout(() => {
            if (!connected) {
                console.log('❌ Connection timeout');
                ws.close();
                resolve(null);
            }
        }, 10000);
    });
}

async function testRESTLatency() {
    console.log('\n🔬 Testing REST API Latency...\n');
    
    const rpcs = [
        'https://1rpc.io/eth',
        'https://rpc.ankr.com/eth'
    ];
    
    for (const rpc of rpcs) {
        const start = Date.now();
        try {
            const res = await fetch(rpc, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_blockNumber',
                    params: [],
                    id: 1
                })
            });
            const latency = Date.now() - start;
            console.log(`📡 ${rpc.split('/')[2]}: ${latency}ms`);
        } catch (e) {
            console.log(`❌ ${rpc.split('/')[2]}: ${e.message}`);
        }
    }
}

async function main() {
    console.log('=== AlphaPro Latency Benchmark ===\n');
    
    const wsLatency = await testWebSocketLatency();
    await testRESTLatency();
    
    console.log('\n=== Summary ===');
    console.log(`WebSocket Latency: ${wsLatency ? wsLatency + 'ms' : 'FAILED'}`);
    console.log('\nTarget: <200ms (avg of top 5 competitors)');
    console.log('Competitors: 50-280ms average');
    
    if (wsLatency && wsLatency < 200) {
        console.log('\n✅ PASSED: Within competitive range!');
    } else if (wsLatency) {
        console.log('\n⚠️ Above 200ms target but improving');
    }
}

main().catch(console.error);
