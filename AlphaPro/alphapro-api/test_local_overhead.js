
const { performance } = require('perf_hooks');
const ethers = require('ethers');

async function testLocalSpeed() {
    const signer = new ethers.Wallet('0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    const msg = "AlphaPro Speed Test";

    console.log('--- AlphaPro Local Processing Speed ---');

    const tStart = performance.now();
    for (let i = 0; i < 100; i++) {
        const hash = ethers.utils.id("test" + i);
    }
    const tHash = performance.now();
    console.log(`- 100x Hashing: ${(tHash - tStart).toFixed(4)}ms`);

    const tSignStart = performance.now();
    await signer.signMessage(msg);
    const tSignEnd = performance.now();
    console.log(`- Message Signing: ${(tSignEnd - tSignStart).toFixed(4)}ms`);

    const tAddrStart = performance.now();
    const addr = signer.address;
    const tAddrEnd = performance.now();
    console.log(`- Address Recovery: ${(tAddrEnd - tAddrStart).toFixed(4)}ms`);
}

testLocalSpeed().catch(console.error);
