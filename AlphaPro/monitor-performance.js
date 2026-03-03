/**
 * AlphaPro Production Monitor
 * Monitors profit generation, latency, and KPIs across all instances
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    instances: 10,
    apiBasePort: 3001,
    brainBasePort: 5001,
    checkInterval: 10000, // 10 seconds
    latencyTestInterval: 60000 // 60 seconds
};

// Color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    bold: '\x1b[1m'
};

class AlphaProMonitor {
    constructor() {
        this.stats = {
            totalProfit: 0,
            totalTrades: 0,
            successfulTrades: 0,
            failedTrades: 0,
            avgLatency: 0,
            uptime: Date.now(),
            lastUpdate: Date.now()
        };
        this.instanceStats = new Map();
        this.latencyHistory = [];
    }

    /**
     * Check all instances and collect stats
     */
    async checkAllInstances() {
        console.clear();
        console.log(`${colors.cyan}╔══════════════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║          ALPHAPRO PRODUCTION MONITOR - REAL-TIME KPIs           ║${colors.reset}`);
        console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

        let runningInstances = 0;
        let totalProfit = 0;
        let totalTrades = 0;
        let totalSuccessful = 0;

        // Check each instance
        for (let i = 0; i < CONFIG.instances; i++) {
            const port = CONFIG.apiBasePort + i;
            const instanceId = `Instance-${i + 1}`;
            
            try {
                const healthRes = await axios.get(`http://localhost:${port}/api/health`, { timeout: 5000 });
                const stateRes = await axios.get(`http://localhost:${port}/api/engine/state`, { timeout: 5000 });
                const statsRes = await axios.get(`http://localhost:${port}/api/engine/stats`, { timeout: 5000 });

                const isRunning = healthRes.data?.status === 'ok' || healthRes.data?.healthy;
                const mode = stateRes.data?.mode || 'UNKNOWN';
                const instanceProfit = parseFloat(statsRes.data?.stats?.totalProfit || 0);
                const instanceTrades = parseInt(statsRes.data?.stats?.totalTrades || 0);
                const instanceSuccess = parseInt(statsRes.data?.stats?.successfulTrades || 0);

                if (isRunning) {
                    runningInstances++;
                    totalProfit += instanceProfit;
                    totalTrades += instanceTrades;
                    totalSuccessful += instanceSuccess;

                    this.instanceStats.set(i, {
                        port,
                        running: true,
                        mode,
                        profit: instanceProfit,
                        trades: instanceTrades,
                        success: instanceSuccess,
                        lastCheck: Date.now()
                    });

                    console.log(`${colors.green}✓${colors.reset} ${instanceId} (:${port}) | Mode: ${mode} | Trades: ${instanceTrades} | Profit: ${instanceProfit.toFixed(4)} ETH`);
                } else {
                    console.log(`${colors.red}✗${colors.reset} ${instanceId} (:${port}) | Health check failed`);
                }
            } catch (error) {
                console.log(`${colors.red}✗${colors.reset} ${instanceId} (:${port}) | ${error.message.substring(0, 40)}`);
                this.instanceStats.set(i, { port, running: false, lastCheck: Date.now() });
            }
        }

        // Calculate overall stats
        this.stats = {
            runningInstances,
            totalInstances: CONFIG.instances,
            totalProfit,
            totalTrades,
            successfulTrades: totalSuccessful,
            failedTrades: totalTrades - totalSuccessful,
            winRate: totalTrades > 0 ? ((totalSuccessful / totalTrades) * 100).toFixed(1) : 0,
            uptime: Math.floor((Date.now() - this.stats.uptime) / 1000),
            lastUpdate: Date.now()
        };

        // Print summary
        this.printSummary();

        // Run latency test
        await this.testLatency();
    }

    /**
     * Test latency on primary instance
     */
    async testLatency() {
        const port = CONFIG.apiBasePort;
        const start = Date.now();
        
        try {
            await axios.get(`http://localhost:${port}/api/health`, { timeout: 5000 });
            const latency = Date.now() - start;
            
            this.latencyHistory.push(latency);
            if (this.latencyHistory.length > 10) {
                this.latencyHistory.shift();
            }
            
            const avgLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
            this.stats.avgLatency = avgLatency.toFixed(0);
            
            console.log(`\n${colors.blue}📡 Latency Test:${colors.reset} Current: ${latency}ms | Avg (10 samples): ${avgLatency.toFixed(0)}ms`);
        } catch (error) {
            console.log(`\n${colors.red}📡 Latency Test: FAILED${colors.reset}`);
        }
    }

    /**
     * Print performance summary
     */
    printSummary() {
        console.log(`\n${colors.magenta}══════════════════════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.bold}                           PERFORMANCE SUMMARY${colors.reset}`);
        console.log(`${colors.magenta}══════════════════════════════════════════════════════════════════════${colors.reset}\n`);

        console.log(`  ${colors.cyan}Instance Status:${colors.reset}   ${this.stats.runningInstances}/${this.stats.totalInstances} running`);
        console.log(`  ${colors.green}Total Profit:${colors.reset}     ${this.stats.totalProfit.toFixed(6)} ETH`);
        console.log(`  ${colors.blue}Total Trades:${colors.reset}    ${this.stats.totalTrades}`);
        console.log(`  ${colors.green}Successful:${colors.reset}      ${this.stats.successfulTrades}`);
        console.log(`  ${colors.red}Failed:${colors.reset}           ${this.stats.failedTrades}`);
        console.log(`  ${colors.yellow}Win Rate:${colors.reset}       ${this.stats.winRate}%`);
        console.log(`  ${colors.cyan}Avg Latency:${colors.reset}     ${this.stats.avgLatency}ms`);
        console.log(`  ${colors.magenta}Uptime:${colors.reset}         ${this.formatUptime(this.stats.uptime)}\n`);

        // Status indicator
        const healthScore = this.calculateHealthScore();
        console.log(`  ${colors.bold}System Health:${colors.reset}  ${healthScore >= 80 ? colors.green : healthScore >= 50 ? colors.yellow : colors.red}${healthScore}%${colors.reset}`);
    }

    /**
     * Calculate system health score
     */
    calculateHealthScore() {
        const instanceScore = (this.stats.runningInstances / this.stats.totalInstances) * 50;
        const latencyScore = this.stats.avgLatency < 100 ? 30 : this.stats.avgLatency < 200 ? 20 : 10;
        const winScore = parseFloat(this.stats.winRate) * 0.2;
        
        return Math.min(100, Math.floor(instanceScore + latencyScore + winScore));
    }

    /**
     * Format uptime
     */
    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}h ${minutes}m ${secs}s`;
    }

    /**
     * Save stats to file
     */
    saveStats() {
        const statsFile = path.join(__dirname, 'logs', 'performance-stats.json');
        const data = {
            timestamp: new Date().toISOString(),
            ...this.stats
        };
        
        fs.appendFileSync(statsFile, JSON.stringify(data) + '\n');
    }

    /**
     * Start monitoring
     */
    start() {
        console.log(`${colors.green}Starting AlphaPro Production Monitor...${colors.reset}`);
        console.log(`Checking ${CONFIG.instances} instances every ${CONFIG.checkInterval/1000}s\n`);
        
        // Initial check
        this.checkAllInstances();
        
        // Periodic checks
        setInterval(() => {
            this.checkAllInstances();
        }, CONFIG.checkInterval);
        
        // Periodic save
        setInterval(() => {
            this.saveStats();
        }, 60000);
    }
}

// Main
const monitor = new AlphaProMonitor();
monitor.start();
