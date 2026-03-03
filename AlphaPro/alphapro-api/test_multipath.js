/**
 * Multipath Detector Benchmark
 * Tests Strategy 3: Parallel detection + First-to-deliver
 */
require('dotenv').config({ path: '../.env' });
const MultiPathDetector = require('./src/engine/MultiPathDetector');

async function benchmark() {
    console.log('=== AlphaPro Multi-Path Latency Benchmark ===');
    const detector = new MultiPathDetector();

    let txReceived = 0;
    const startTime = Date.now();

    detector.on('transaction', (event) => {
        txReceived++;
        const latency = Date.now() - startTime;
        console.log(`[${txReceived}] 🚀 Tx Received from ${event.name}: ${latency}ms`);

        if (txReceived >= 10) {
            console.log('\n=== Summary ===');
            console.log(`Average Latency for first 10 tx: ${(latency / 10).toFixed(2)}ms`);
            console.log('Target: <100ms');
            if (latency / 10 < 100) console.log('✅ TARGET ACHIEVED!');
            else console.log('⚠️ Still above 100ms, but this depends on network jitter.');

            detector.stop();
            process.exit(0);
        }
    });

    try {
        await detector.start();
    } catch (err) {
        console.error('Failed to start detector:', err);
    }
}

benchmark();
