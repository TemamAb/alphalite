/**
 * Sentinel Agent - Risk Management & Contract Security
 * 
 * The Sentinel acts as the central risk desk with absolute veto power.
 * It audits contracts for honeypots, rug pulls, and other malicious patterns
 * before any trade is executed.
 * 
 * Implements Protocol 7: The Sentinel Mandate
 * - Pre-trade risk assessment
 * - Contract security auditing
 * - Honeypot detection
 * - Rug pull prevention
 */

const axios = require('axios');
const ethers = require('ethers');

class SentinelAgent {
    constructor(config = {}) {
        this.config = config;
        this.riskTolerance = config.riskTolerance || 0.5; // 0-1 scale
        this.vetoPower = true; // Sentinel has absolute veto
        
        // Risk thresholds
        this.maxSlippage = config.maxSlippage || 0.05; // 5% max slippage
        this.maxValuePerTrade = config.maxValuePerTrade || 100000; // $100k max
        this.minLiquidityRatio = config.minLiquidityRatio || 0.01; // 1% of pool
        
        // Honeypot detection patterns
        this.suspiciousPatterns = [
            { name: 'unverified_contract', weight: 0.9 },
            { name: 'no_ liquidity_lock', weight: 0.8 },
            { name: 'mint_function', weight: 0.95 },
            { name: 'proxy_pattern', weight: 0.6 },
            { name: 'pause_function', weight: 0.7 }
        ];
        
        this.auditHistory = [];
        this.vetoedTrades = 0;
        this.approvedTrades = 0;
    }

    /**
     * Main risk assessment - returns veto decision
     * @param {Object} trade - Trade proposal
     * @returns {Object} - { approved: boolean, riskScore: number, reason: string }
     */
    async assessRisk(trade) {
        const startTime = Date.now();
        
        try {
            // Step 1: Basic validation
            const basicCheck = this.basicValidation(trade);
            if (!basicCheck.approved) {
                return this.vetoTrade(trade, basicCheck.reason, 1.0);
            }
            
            // Step 2: Contract security audit
            const auditResult = await this.auditContract(trade.tokenAddress, trade.chain);
            if (!auditResult.safe) {
                return this.vetoTrade(trade, `Contract failed security audit: ${auditResult.issues.join(', ')}`, auditResult.riskScore);
            }
            
            // Step 3: Liquidity check
            const liquidityCheck = await this.checkLiquidity(trade);
            if (!liquidityCheck.adequate) {
                return this.vetoTrade(trade, `Insufficient liquidity: ${liquidityCheck.ratio}%`, 0.8);
            }
            
            // Step 4: Price impact analysis
            const impactAnalysis = await this.analyzePriceImpact(trade);
            if (impactAnalysis.excessive) {
                return this.vetoTrade(trade, `Excessive price impact: ${impactAnalysis.impact}%`, 0.9);
            }
            
            // Calculate overall risk score
            const riskScore = this.calculateRiskScore(auditResult, liquidityCheck, impactAnalysis);
            
            // Final decision based on risk tolerance
            if (riskScore > this.riskTolerance) {
                return this.vetoTrade(trade, `Risk score ${riskScore} exceeds tolerance ${this.riskTolerance}`, riskScore);
            }
            
            // Approve trade
            this.approvedTrades++;
            const assessment = {
                approved: true,
                riskScore: riskScore,
                reason: 'Trade approved by Sentinel',
                auditResult,
                liquidityCheck,
                impactAnalysis,
                assessmentTime: Date.now() - startTime
            };
            
            this.auditHistory.push({ trade, ...assessment, timestamp: Date.now() });
            return assessment;
            
        } catch (error) {
            // On error, default to veto for safety
            return this.vetoTrade(trade, `Sentinel error: ${error.message}`, 1.0);
        }
    }

    /**
     * Basic trade validation
     */
    basicValidation(trade) {
        if (!trade.tokenAddress || !ethers.isAddress(trade.tokenAddress)) {
            return { approved: false, reason: 'Invalid token address' };
        }
        
        if (trade.value > this.maxValuePerTrade) {
            return { approved: false, reason: `Trade value $${trade.value} exceeds max $${this.maxValuePerTrade}` };
        }
        
        if (!trade.chain) {
            return { approved: false, reason: 'Chain not specified' };
        }
        
        return { approved: true };
    }

    /**
     * Audit contract for security issues
     */
    async auditContract(tokenAddress, chain) {
        const issues = [];
        let riskScore = 0;
        
        try {
            // Get contract code
            const rpcUrl = this.config.rpcUrls?.[chain] || this.getDefaultRPC(chain);
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const code = await provider.getCode(tokenAddress);
            
            if (!code || code === '0x') {
                issues.push('Contract not deployed');
                riskScore += 0.5;
            }
            
            // Check for suspicious patterns in bytecode
            const codeLower = code.toLowerCase();
            
            // Check for mint function (potential inflation scam)
            if (codeLower.includes('75a16e') || codeLower.includes('40c10f19')) {
                issues.push('Mint function detected');
                riskScore += this.suspiciousPatterns.find(p => p.name === 'mint_function').weight;
            }
            
            // Check for pause function (can freeze funds)
            if (codeLower.includes('8456cb59') || codeLower.includes('4d552f')) {
                issues.push('Pause function detected');
                riskScore += this.suspiciousPatterns.find(p => p.name === 'pause_function').weight;
            }
            
            // Check for proxy pattern (upgradeable, higher risk)
            if (codeLower.includes('363d3d3d') || codeLower.includes('5c60da1b')) {
                issues.push('Proxy pattern detected');
                riskScore += this.suspiciousPatterns.find(p => p.name === 'proxy_pattern').weight;
            }
            
            // Additional security checks via DexScreener API
            try {
                const dexResponse = await axios.get(
                    `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
                );
                
                if (dexResponse.data && dexResponse.data.pair) {
                    const pair = dexResponse.data.pair;
                    
                    // Check for newly created pairs (potential rug)
                    const pairAge = Date.now() - new Date(pair.pairCreatedAt).getTime();
                    const dayInMs = 24 * 60 * 60 * 1000;
                    
                    if (pairAge < dayInMs) {
                        issues.push('Pair created less than 24h ago');
                        riskScore += 0.4;
                    }
                    
                    // Check liquidity
                    const liquidityUSD = parseFloat(pair.liquidity?.usd || 0);
                    if (liquidityUSD < 10000) {
                        issues.push('Very low liquidity');
                        riskScore += 0.3;
                    }
                    
                    // Check for suspicious trading volume
                    const volume24h = parseFloat(pair.volume?.h24 || 0);
                    if (volume24h === 0 && liquidityUSD > 0) {
                        issues.push('No trading volume despite liquidity');
                        riskScore += 0.5;
                    }
                }
            } catch (apiError) {
                issues.push('Could not verify on DexScreener');
                riskScore += 0.2;
            }
            
            return {
                safe: issues.length === 0,
                issues,
                riskScore: Math.min(riskScore, 1.0)
            };
            
        } catch (error) {
            return {
                safe: false,
                issues: [`Audit failed: ${error.message}`],
                riskScore: 1.0
            };
        }
    }

    /**
     * Check liquidity adequacy
     */
    async checkLiquidity(trade) {
        try {
            const dexResponse = await axios.get(
                `https://api.dexscreener.com/latest/dex/tokens/${trade.tokenAddress}`
            );
            
            if (!dexResponse.data || !dexResponse.data.pair) {
                return { adequate: false, ratio: 0, reason: 'No liquidity data' };
            }
            
            const pair = dexResponse.data.pair;
            const liquidityUSD = parseFloat(pair.liquidity?.usd || 0);
            const tradeValueUSD = trade.value || 0;
            
            const ratio = liquidityUSD > 0 ? tradeValueUSD / liquidityUSD : 0;
            
            return {
                adequate: ratio <= this.minLiquidityRatio,
                ratio: (ratio * 100).toFixed(2),
                liquidityUSD,
                requiredRatio: this.minLiquidityRatio * 100
            };
            
        } catch (error) {
            return { adequate: false, ratio: 0, reason: error.message };
        }
    }

    /**
     * Analyze price impact
     */
    async analyzePriceImpact(trade) {
        try {
            const dexResponse = await axios.get(
                `https://api.dexscreener.com/latest/dex/tokens/${trade.tokenAddress}`
            );
            
            if (!dexResponse.data || !dexResponse.data.pair) {
                return { excessive: true, impact: 100, reason: 'No price data' };
            }
            
            const pair = dexResponse.data.pair;
            const priceUSD = parseFloat(pair.priceUSD || 0);
            const liquidityUSD = parseFloat(pair.liquidity?.usd || 0);
            
            // Estimate price impact using AMM formula
            const tradeValueUSD = trade.value || 0;
            const impactRatio = liquidityUSD > 0 ? tradeValueUSD / liquidityUSD : 1;
            
            // Simplified price impact calculation (actual would use sqrt formula)
            const impact = Math.min(impactRatio * 100 * 0.5, 100);
            
            return {
                excessive: impact > this.maxSlippage * 100,
                impact: impact.toFixed(2),
                maxAllowed: this.maxSlippage * 100,
                priceUSD,
                liquidityUSD
            };
            
        } catch (error) {
            return { excessive: true, impact: 100, reason: error.message };
        }
    }

    /**
     * Calculate overall risk score
     */
    calculateRiskScore(auditResult, liquidityCheck, impactAnalysis) {
        // Weighted risk calculation
        const auditWeight = 0.5;
        const liquidityWeight = 0.3;
        const impactWeight = 0.2;
        
        let score = 
            (auditResult.riskScore * auditWeight) +
            ((parseFloat(liquidityCheck.ratio) / 100) * liquidityWeight) +
            ((parseFloat(impactAnalysis.impact) / 100) * impactWeight);
        
        return Math.min(score, 1.0);
    }

    /**
     * Veto a trade
     */
    vetoTrade(trade, reason, riskScore) {
        this.vetoedTrades++;
        const veto = {
            approved: false,
            riskScore,
            reason,
            timestamp: Date.now()
        };
        
        this.auditHistory.push({ trade, ...veto });
        
        console.log(`[SENTINEL] 🚫 VETOED: ${reason} (Risk: ${riskScore})`);
        
        return veto;
    }

    /**
     * Get default RPC for chain
     */
    getDefaultRPC(chain) {
        const defaults = {
            'ethereum': 'https://eth-mainnet.g.alchemy.com/v2/demo',
            'arbitrum': 'https://arb-mainnet.g.alchemy.com/v2/demo',
            'optimism': 'https://opt-mainnet.g.alchemy.com/v2/demo',
            'polygon': 'https://polygon-mainnet.g.alchemy.com/v2/demo',
            'base': 'https://base-mainnet.g.alchemy.com/v2/demo'
        };
        return defaults[chain?.toLowerCase()] || defaults.ethereum;
    }

    /**
     * Get Sentinel status
     */
    getStatus() {
        const totalAssessed = this.approvedTrades + this.vetoedTrades;
        const approvalRate = totalAssessed > 0 ? (this.approvedTrades / totalAssessed * 100) : 0;
        
        return {
            riskTolerance: this.riskTolerance,
            maxSlippage: this.maxSlippage,
            maxValuePerTrade: this.maxValuePerTrade,
            approvedTrades: this.approvedTrades,
            vetoedTrades: this.vetoedTrades,
            approvalRate: approvalRate.toFixed(1),
            recentAudits: this.auditHistory.slice(-10)
        };
    }

    /**
     * Update risk parameters
     */
    updateParameters(params) {
        if (params.riskTolerance !== undefined) this.riskTolerance = params.riskTolerance;
        if (params.maxSlippage !== undefined) this.maxSlippage = params.maxSlippage;
        if (params.maxValuePerTrade !== undefined) this.maxValuePerTrade = params.maxValuePerTrade;
        
        console.log(`[SENTINEL] Parameters updated:`, params);
    }
}

module.exports = SentinelAgent;
