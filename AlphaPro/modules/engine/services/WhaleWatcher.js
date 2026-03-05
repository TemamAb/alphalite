/**
 * Whale Watcher Service
 * Monitors the mempool for transactions > $1M to detect competitor movements and potential
 * front-running opportunities (Sandwich Attacks).
 */
const EventEmitter = require('events');
const { ethers } = require('ethers');

class WhaleWatcher extends EventEmitter {
    constructor() {
        super();
        this.whaleThresholdUsd = 1000000; // $1M threshold
        this.ethPrice = 2500; // Baseline, updated dynamically
        this.detectedWhales = [];
        // Known competitor bot addresses (placeholders)
        this.competitorAddresses = new Set([
            '0x0000000000000000000000000000000000000000', 
            '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13', // jaredfromsubway.eth (example)
        ]);
    }

    setEthPrice(price) {
        if (price > 0) this.ethPrice = price;
    }

    analyzeTransaction(tx) {
        try {
            // 1. Value Analysis
            let valueEth = 0;
            if (tx.value && tx.value !== '0x0') {
                // Handle both hex and BigNumber
                valueEth = parseFloat(ethers.utils.formatEther(tx.value));
            }
            
            const valueUsd = valueEth * this.ethPrice;
            const isWhale = valueUsd >= this.whaleThresholdUsd;

            // 2. Competitor Analysis (Address matching)
            const from = tx.from ? tx.from.toLowerCase() : '';
            const to = tx.to ? tx.to.toLowerCase() : '';
            const isCompetitor = this.competitorAddresses.has(from) || this.competitorAddresses.has(to);

            if (isWhale || isCompetitor) {
                const eventType = isCompetitor ? 'COMPETITOR_DETECTED' : 'WHALE_MOVEMENT';
                
                const whaleEvent = {
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    valueEth: valueEth.toFixed(4),
                    valueUsd: valueUsd.toFixed(2),
                    type: eventType,
                    timestamp: Date.now(),
                    priority: isCompetitor ? 'CRITICAL' : 'HIGH'
                };

                this.detectedWhales.unshift(whaleEvent);
                if (this.detectedWhales.length > 100) this.detectedWhales.pop();

                console.log(`[WHALE-WATCHER] 🐋 ${eventType}: ${valueEth.toFixed(2)} ETH ($${(valueUsd/1000000).toFixed(2)}M)`);
                this.emit('whale:detected', whaleEvent);
            }
        } catch (error) {
            // Silent fail for parsing errors to maintain speed
        }
    }

    getDetectedWhales() {
        return this.detectedWhales;
    }
}

module.exports = new WhaleWatcher();