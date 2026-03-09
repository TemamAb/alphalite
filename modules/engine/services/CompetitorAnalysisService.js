const axios = require('axios');

class CompetitorAnalysisService {
    constructor() {
        // Top MEV bot addresses (JaredFromSubway, etc.)
        this.competitors = [
            '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13', 
            '0x6b75d8AF000000e20B7a7DDf000Ba900b4009A80'
        ];
        this.etherscanKey = process.env.ETHERSCAN_API_KEY;
    }

    /**
     * Fetch real competitor metrics to see what we missed
     * Returns a score 0-10 based on competitor activity intensity
     */
    async getMarketMisses() {
        if (!this.etherscanKey) {
            // Fallback: If no key, return 0 (neutral)
            return 0;
        }

        try {
            const requests = this.competitors.map(addr => 
                axios.get(`https://api.etherscan.io/api?module=account&action=txlist&address=${addr}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${this.etherscanKey}`, { timeout: 2000 })
            );
            
            const responses = await Promise.allSettled(requests);
            
            let recentActivityCount = 0;
            const now = Math.floor(Date.now() / 1000);
            
            for (const res of responses) {
                if (res.status === 'fulfilled' && res.value.data.status === '1') {
                    const txs = res.value.data.result;
                    // Check for txs in last 60 seconds
                    const recent = txs.filter(tx => (now - parseInt(tx.timeStamp)) < 60);
                    recentActivityCount += recent.length;
                }
            }
            
            // Normalize: If competitors are doing > 5 trades/min, that's high activity (10)
            return Math.min(recentActivityCount * 2, 10);
            
        } catch (error) {
            console.error('[COMPETITOR] Analysis failed:', error.message);
            return 0;
        }
    }

    /**
     * Get detailed activity for dashboard monitor
     */
    async getCompetitorActivity() {
        if (!this.etherscanKey) {
             return this.competitors.map((addr, i) => ({
                address: addr,
                name: i === 0 ? 'JaredFromSubway' : `MEV Bot #${i + 1}`,
                txCount: 0,
                lastActive: 0,
                status: 'dormant'
            }));
        }

        try {
            const requests = this.competitors.map(addr => 
                axios.get(`https://api.etherscan.io/api?module=account&action=txlist&address=${addr}&startblock=0&endblock=99999999&page=1&offset=1&sort=desc&apikey=${this.etherscanKey}`, { timeout: 2000 })
            );
            
            const responses = await Promise.allSettled(requests);
            
            return this.competitors.map((addr, index) => {
                const res = responses[index];
                let lastActive = 0;
                let status = 'dormant';

                if (res.status === 'fulfilled' && res.value.data.status === '1' && res.value.data.result.length > 0) {
                    const tx = res.value.data.result[0];
                    lastActive = parseInt(tx.timeStamp) * 1000;
                    // Active if last tx within 1 hour
                    if (Date.now() - lastActive < 3600000) {
                        status = 'active';
                    }
                }
                
                return {
                    address: addr,
                    name: index === 0 ? 'JaredFromSubway' : `MEV Bot #${index + 1}`,
                    // Real tx count would require historical data query; return null for now
                    txCount: null,
                    lastActive,
                    status
                };
            });
        } catch (error) {
            console.error('[COMPETITOR] Activity fetch failed:', error.message);
            return [];
        }
    }
}

module.exports = new CompetitorAnalysisService();