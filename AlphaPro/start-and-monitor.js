/**
 * AlphaPro Complete Production Launcher
 * Starts 10 instances + monitoring dashboard
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const CONFIG = {
    instances: 10,
    apiBasePort: 3001,
    brainBasePort: 5001,
    monitorDelay: 8000,
    startupDelay: 5000
};

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

class AlphaProLauncher {
    constructor() {
        this.apiProcesses = new Map();
        this.brainProcesses = new Map();
        this.isRunning = false;
    }

    async start() {
        console.clear();
        console.log(`${colors.cyan}╔══════════════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║        ALPHAPRO PRODUCTION LAUNCHER + MONITOR                    ║${colors.reset}`);
        console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

        // Ensure logs directory
        const logsDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        console.log(`${colors.yellow}[1/4] Preparing ports...${colors.reset}\n`);

        // Start all instances
        console.log(`${colors.blue}[2/4] Starting 10 AlphaPro instances...${colors.reset}\n`);

        for (let i = 0; i < CONFIG.instances; i++) {
            const apiPort = CONFIG.apiBasePort + i;
            const brainPort = CONFIG.brainBasePort + i;
            
            await this.startInstance(i, apiPort, brainPort);
            await this.delay(800);
        }

        console.log(`\n${colors.green}✓ All instances started${colors.reset}\n`);

        // Wait for startup
        console.log(`${colors.yellow}[3/4] Waiting for instances to initialize...${colors.reset}`);
        await this.delay(CONFIG.startupDelay);

        // Verify and start monitoring
        console.log(`${colors.blue}[4/4] Verifying instances and starting monitor...${colors.reset}\n`);
        
        await this.verifyAndMonitor();

        // Keep running
        this.isRunning = true;
        process.on('SIGINT', () => this.shutdown());
    }

    async startInstance(index, apiPort, brainPort) {
        const instanceId = `alphapro-${index + 1}`;
        
        // API (Node.js) - Each instance uses its own port
        const apiEnv = {
            ...process.env,
            PORT: apiPort.toString(),  // Use actual port here
            INSTANCE_ID: instanceId,
            NODE_ENV: 'production',
            TRADING_MODE: 'LIVE'
        };

        const apiProc = spawn('node', [path.join(__dirname, 'alphapro-api', 'app.js')], {
            env: apiEnv,
            cwd: __dirname,
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
        });

        // Log to file
        const apiLogPath = path.join(__dirname, 'logs', `instance-${index+1}.log`);
        const apiLog = fs.createWriteStream(apiLogPath, { flags: 'a' });
        apiProc.stdout.pipe(apiLog);
        apiProc.stderr.pipe(apiLog);

        this.apiProcesses.set(index, apiProc);

        // Brain (Python)
        const brainEnv = {
            ...process.env,
            PORT: brainPort.toString(),
            BRAIN_PORT: brainPort.toString(),
            INSTANCE_ID: instanceId
        };

        const brainProc = spawn('python', [path.join(__dirname, 'alphapro-brain', 'app.py')], {
            env: brainEnv,
            cwd: __dirname,
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
        });

        const brainLogPath = path.join(__dirname, 'logs', `brain-${index+1}.log`);
        const brainLog = fs.createWriteStream(brainLogPath, { flags: 'a' });
        brainProc.stdout.pipe(brainLog);
        brainProc.stderr.pipe(brainLog);

        this.brainProcesses.set(index, brainProc);

        console.log(`   ${colors.green}→${colors.reset} Instance ${index + 1}: API :${apiPort}, Brain :${brainPort}`);
    }

    async verifyAndMonitor() {
        console.log(`${colors.cyan}══════════════════════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.bold}                      REAL-TIME MONITORING${colors.reset}`);
        console.log(`${colors.cyan}══════════════════════════════════════════════════════════════════════${colors.reset}\n`);

        // Initial check
        await this.checkInstances();

        // Monitor loop
        setInterval(async () => {
            await this.checkInstances();
        }, 10000);
    }

    async checkInstances() {
        let running = 0;
        let totalProfit = 0;
        let totalTrades = 0;
        let latencies = [];

        for (let i = 0; i < CONFIG.instances; i++) {
            const port = CONFIG.apiBasePort + i;
            
            try {
                const start = Date.now();
                const health = await axios.get(`http://localhost:${port}/api/health`, { timeout: 3000 });
                const latency = Date.now() - start;
                latencies.push(latency);

                if (health.data) {
                    running++;
                    
                    // Get stats
                    try {
                        const stats = await axios.get(`http://localhost:${port}/api/engine/stats`, { timeout: 3000 });
                        totalProfit += parseFloat(stats.data?.stats?.totalProfit || 0);
                        totalTrades += parseInt(stats.data?.stats?.totalTrades || 0);
                    } catch (e) {}
                }
            } catch (e) {}
        }

        // Calculate avg latency
        const avgLatency = latencies.length > 0 
            ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(0)
            : 'N/A';

        // Display
        console.clear();
        console.log(`${colors.cyan}╔══════════════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║          ALPHAPRO PRODUCTION MONITOR - LIVE KPIs                ║${colors.reset}`);
        console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

        console.log(`  ${colors.bold}Instance Status:${colors.reset}  ${running}/${CONFIG.instances} RUNNING`);
        console.log(`  ${colors.green}Total Profit:${colors.reset}    ${totalProfit.toFixed(6)} ETH`);
        console.log(`  ${colors.blue}Total Trades:${colors.reset}   ${totalTrades}`);
        console.log(`  ${colors.cyan}Avg Latency:${colors.reset}     ${avgLatency}ms`);
        
        if (running < CONFIG.instances) {
            console.log(`\n  ${colors.yellow}⚠️ ${CONFIG.instances - running} instance(s) down${colors.reset}`);
        }

        console.log(`\n  ${colors.magenta}Instance Details:${colors.reset}`);
        for (let i = 0; i < CONFIG.instances; i++) {
            const port = CONFIG.apiBasePort + i;
            try {
                await axios.get(`http://localhost:${port}/api/health`, { timeout: 1000 });
                console.log(`    ${colors.green}✓${colors.reset} Instance ${i+1} (:${port})`);
            } catch (e) {
                console.log(`    ${colors.red}✗${colors.reset} Instance ${i+1} (:${port}) - DOWN`);
            }
        }

        console.log(`\n  ${colors.gray}Next update in 10s... (Ctrl+C to stop)${colors.reset}`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async shutdown() {
        console.log(`\n${colors.yellow}Shutting down...${colors.reset}`);
        
        for (let [index, proc] of this.apiProcesses) {
            if (proc && !proc.killed) proc.kill('SIGTERM');
        }
        for (let [index, proc] of this.brainProcesses) {
            if (proc && !proc.killed) proc.kill('SIGTERM');
        }
        
        await this.delay(2000);
        process.exit(0);
    }
}

// Start
const launcher = new AlphaProLauncher();
launcher.start().catch(console.error);
