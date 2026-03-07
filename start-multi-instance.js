/**
 * AlphaPro Multi-Instance Deployment
 * Runs 10 parallel instances for fault tolerance and stability
 * Each instance runs on a different port with independent memory
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration: 10 instances on different ports
const CONFIG = {
    instances: 10,
    apiBasePort: 3001,
    brainBasePort: 5001,
    restartDelay: 5000,
    maxRestarts: 5
};

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

class MultiInstanceManager {
    constructor() {
        this.apiProcesses = new Map();
        this.brainProcesses = new Map();
        this.instanceInfo = new Map();
        this.isRunning = false;
    }

    /**
     * Start all instances
     */
    async startAll() {
        console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║     ALPHAPRO 10-INSTANCE PRODUCTION DEPLOYMENT         ║${colors.reset}`);
        console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

        // Ensure logs directory exists
        const logsDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        // Start all instances
        for (let i = 0; i < CONFIG.instances; i++) {
            const apiPort = CONFIG.apiBasePort + i;
            const brainPort = CONFIG.brainBasePort + i;
            const instanceId = `alphapro-${i + 1}`;
            
            console.log(`${colors.blue}[${instanceId}] Starting API on port ${apiPort}, Brain on port ${brainPort}...${colors.reset}`);
            
            // Start both API and Brain
            await this.startInstance(i, apiPort, brainPort, instanceId);
            
            // Stagger startup
            await this.delay(800);
        }

        console.log(`\n${colors.green}✓ All ${CONFIG.instances} instances started!${colors.reset}\n`);
        
        this.isRunning = true;
        
        // Start health monitoring
        this.startMonitoring();
        
        // Setup graceful shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }

    /**
     * Start a single instance (API + Brain)
     */
    async startInstance(index, apiPort, brainPort, instanceId) {
        return new Promise((resolve) => {
            // ===== START API (Node.js) =====
            const apiEnv = {
                ...process.env,
                PORT: '3000',  // Internal port always 3000
                API_EXTERNAL_PORT: apiPort.toString(),
                BRAIN_PORT: brainPort.toString(),
                INSTANCE_ID: instanceId,
                NODE_ENV: 'production',
                TRADING_MODE: 'LIVE'
            };

            const apiPath = path.join(__dirname, 'alphapro-api', 'app.js');
            
            const apiProc = spawn('node', [apiPath], {
                env: apiEnv,
                cwd: __dirname,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            this.apiProcesses.set(index, apiProc);

            // ===== START BRAIN (Python) =====
            const brainEnv = {
                ...process.env,
                PORT: brainPort.toString(),
                BRAIN_PORT: brainPort.toString(),
                INSTANCE_ID: instanceId
            };

            const brainPath = path.join(__dirname, 'alphapro-brain', 'app.py');
            
            const brainProc = spawn('python', [brainPath], {
                env: brainEnv,
                cwd: __dirname,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            this.brainProcesses.set(index, brainProc);

            // Track the instance
            this.instanceInfo.set(index, {
                id: instanceId,
                apiPort,
                brainPort,
                started: Date.now(),
                status: 'starting',
                apiRestarts: 0,
                brainRestarts: 0
            });

            // Handle API stdout
            apiProc.stdout.on('data', (data) => {
                const output = data.toString().trim();
                if (output.includes('Profit engine started') || output.includes('API Server running') || output.includes('Listening on')) {
                    const info = this.instanceInfo.get(index);
                    if (info && info.status === 'starting') {
                        info.status = 'running';
                        console.log(`${colors.green}✓ [${instanceId}] API running on port ${apiPort}${colors.reset}`);
                    }
                }
            });

            // Handle API stderr
            apiProc.stderr.on('data', (data) => {
                const output = data.toString().trim();
                if (output.toLowerCase().includes('error')) {
                    console.error(`${colors.red}[${instanceId}-API] ${output.substring(0, 100)}${colors.reset}`);
                }
            });

            // Handle Brain stdout
            brainProc.stdout.on('data', (data) => {
                const output = data.toString().trim();
                if (output.includes('started on port')) {
                    console.log(`${colors.green}✓ [${instanceId}] Brain running on port ${brainPort}${colors.reset}`);
                }
            });

            // Handle Brain stderr
            brainProc.stderr.on('data', (data) => {
                const output = data.toString().trim();
                // Python warnings are verbose, only show errors
                if (output.toLowerCase().includes('error') || output.toLowerCase().includes('exception')) {
                    console.error(`${colors.red}[${instanceId}-Brain] ${output.substring(0, 100)}${colors.reset}`);
                }
            });

            // Handle API exit
            apiProc.on('exit', (code) => {
                const info = this.instanceInfo.get(index);
                if (info) {
                    console.warn(`${colors.yellow}[${instanceId}-API] Process exited (code ${code})${colors.reset}`);
                    if (info.apiRestarts < CONFIG.maxRestarts) {
                        info.apiRestarts++;
                        setTimeout(() => this.startInstance(index, apiPort, brainPort, instanceId), CONFIG.restartDelay);
                    }
                }
            });

            // Handle Brain exit
            brainProc.on('exit', (code) => {
                const info = this.instanceInfo.get(index);
                if (info) {
                    console.warn(`${colors.yellow}[${instanceId}-Brain] Process exited (code ${code})${colors.reset}`);
                    if (info.brainRestarts < CONFIG.maxRestarts) {
                        info.brainRestarts++;
                        // Brain restart handled in main startInstance
                    }
                }
            });

            setTimeout(() => resolve(true), 300);
        });
    }

    /**
     * Health monitoring loop
     */
    startMonitoring() {
        console.log(`${colors.cyan}[MONITOR] Starting health monitoring (checks every 30s)...${colors.reset}\n`);
        
        this.monitorInterval = setInterval(() => {
            if (!this.isRunning) return;
            
            let apiRunning = 0;
            let brainRunning = 0;
            
            for (let [index, apiProc] of this.apiProcesses) {
                const brainProc = this.brainProcesses.get(index);
                const info = this.instanceInfo.get(index);
                
                if (apiProc && !apiProc.killed) {
                    apiRunning++;
                } else if (info) {
                    console.warn(`${colors.red}[${info.id}-API] DOWN${colors.reset}`);
                }
                
                if (brainProc && !brainProc.killed) {
                    brainRunning++;
                } else if (info) {
                    console.warn(`${colors.red}[${info.id}-Brain] DOWN${colors.reset}`);
                }
            }
            
            console.log(`${colors.blue}[MONITOR] APIs: ${apiRunning}/${CONFIG.instances} | Brains: ${brainRunning}/${CONFIG.instances}${colors.reset}`);
            
            // Alert if too many failed
            if (apiRunning < CONFIG.instances / 2) {
                console.error(`${colors.red}ALERT: More than 50% of APIs failed!${colors.reset}`);
            }
        }, 30000);
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log(`\n${colors.yellow}Shutting down all instances...${colors.reset}`);
        
        this.isRunning = false;
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }

        // Kill all API processes
        for (let [index, proc] of this.apiProcesses) {
            if (proc && !proc.killed) {
                proc.kill('SIGTERM');
            }
        }

        // Kill all Brain processes
        for (let [index, proc] of this.brainProcesses) {
            if (proc && !proc.killed) {
                proc.kill('SIGTERM');
            }
        }
        
        await this.delay(2000);
        console.log(`${colors.green}All instances stopped.${colors.reset}`);
        process.exit(0);
    }

    /**
     * Utility: delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Main
const manager = new MultiInstanceManager();
manager.startAll().catch(console.error);
