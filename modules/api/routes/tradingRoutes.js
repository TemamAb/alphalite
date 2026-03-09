const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const tradeAuditService = require('../services/TradeAuditService');
const walletPersistenceService = require('../services/WalletPersistenceService');
let deploymentPersistenceService = null;

try { deploymentPersistenceService = require('../services/DeploymentPersistenceService'); } catch (e) { console.warn('[TRADING] DeploymentPersistenceService not available'); }
let aiAutoOptimizer = null;
let aiServiceFactory = null;
let fileSystemService = null;
let brainConnector = null;
let competitorAnalysis = null;
let executionOrchestrator = null;
let profitEngine = null;

try { aiAutoOptimizer = require('../../engine/services/AIAutoOptimizer'); } catch (e) { console.warn('[TRADING] AIAutoOptimizer not available'); }
try { aiServiceFactory = require('../../engine/services/AIServiceFactory'); } catch (e) { console.warn('[TRADING] AIServiceFactory not available'); }
try { fileSystemService = require('../../engine/services/FileSystemService'); } catch (e) { console.warn('[TRADING] FileSystemService not available'); }
try { brainConnector = require('../../engine/services/BrainConnector'); } catch (e) { console.warn('[TRADING] BrainConnector not available'); }
try { competitorAnalysis = require('../../engine/services/CompetitorAnalysisService'); } catch (e) { console.warn('[TRADING] CompetitorAnalysisService not available'); }
try { executionOrchestrator = require('../../engine/services/ExecutionOrchestrator'); } catch (e) { console.warn('[TRADING] ExecutionOrchestrator not available'); }
try { profitEngine = require('../../engine/EnterpriseProfitEngine'); } catch (e) { console.warn('[TRADING] EnterpriseProfitEngine not available'); }

// ... existing routes ...

/**
 * @route POST /api/ai/optimizer/trigger
 * @desc Manually trigger an AI optimization cycle
 * @access Private
 */
router.post('/ai/optimizer/trigger', async (req, res) => {
    try {
        console.log('[API] Manual AI optimization triggered by user');
        
        if (!aiAutoOptimizer || !aiAutoOptimizer.triggerOptimization) {
            return res.status(503).json({ 
                success: false, 
                error: 'AI optimizer service not available' 
            });
        }
        
        // Trigger the optimization process
        // Note: This is an async process but we might not wait for full completion 
        // if it takes too long, or we can await it if it's fast enough.
        // For now, we'll trigger it and return success immediately.
        aiAutoOptimizer.triggerOptimization();

        res.json({ 
            success: true, 
            message: 'AI optimization cycle triggered successfully.' 
        });
    } catch (error) {
        console.error('[API] Failed to trigger optimization:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to trigger optimization cycle.' 
        });
    }
});

/**
 * @route POST /api/ai/optimizer/config
 * @desc Update AI optimizer configuration
 * @access Private
 */
router.post('/ai/optimizer/config', (req, res) => {
    try {
        if (!aiAutoOptimizer || !aiAutoOptimizer.updateConfig) {
            return res.status(503).json({ 
                success: false, 
                error: 'AI optimizer service not available' 
            });
        }
        
        const { mutationRate, optimizationInterval } = req.body;
        aiAutoOptimizer.updateConfig({ mutationRate, optimizationInterval });
        res.json({ success: true, message: 'AI configuration updated' });
    } catch (error) {
        console.error('[API] Failed to update AI config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
});

/**
 * @route GET /api/ai/optimizer
 * @desc Get current AI optimizer state
 * @access Private
 */
router.get('/ai/optimizer', (req, res) => {
    try {
        if (!aiAutoOptimizer || !aiAutoOptimizer.getState) {
            return res.status(503).json({ 
                success: false, 
                error: 'AI optimizer service not available' 
            });
        }
        const state = aiAutoOptimizer.getState();
        res.json(state);
    } catch (error) {
        console.error('[API] Failed to fetch AI state:', error);
        res.status(500).json({ error: 'Failed to fetch AI state' });
    }
});

/**
 * @route GET /api/copilot
 * @desc Get AI Copilot response
 * @access Private
 */
router.get('/copilot', async (req, res) => {
    try {
        const { question, persona, provider } = req.query;
        
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        // Check if AI service is available
        if (!aiServiceFactory) {
            return res.status(503).json({ 
                success: false, 
                error: 'AI service not available' 
            });
        }
        
        // Initialize factory with environment variables if not already done
        // Ideally this should be done once at startup, but for safety we check here
        if (!aiServiceFactory.config.openaiApiKey && !aiServiceFactory.config.geminiApiKey) {
            aiServiceFactory.initialize({
                openaiApiKey: process.env.OPENAI_API_KEY,
                geminiApiKey: process.env.GEMINI_API_KEY
            });
        }

        const aiService = aiServiceFactory.getService(provider || 'openai');
        
        if (!aiService) {
            return res.status(503).json({ 
                success: false, 
                error: 'AI service not available for provider: ' + (provider || 'openai') 
            });
        }
        
        const systemPrompt = `You are Alpha Copilot, an advanced AI trading assistant. 
        Current Persona: ${persona ? persona.toUpperCase() : 'AUTO'}.
        Provide concise, actionable insights for high-frequency trading.`;

        const answer = await aiService.generateResponse(question, { systemPrompt });

        // Parse AI response for action blocks
        let suggestedAction = null;
        const jsonMatch = answer.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            try {
                suggestedAction = JSON.parse(jsonMatch[1]);
            } catch (e) {
                console.error('[API] Failed to parse AI action JSON', e);
            }
        }

        // Integrate with real engine stats
        const engineStatus = profitEngine ? profitEngine.getStatus() : { mode: 'STOPPED', stats: { totalTrades: 0, totalProfit: 0, successfulTrades: 0 } };
        const engineStats = engineStatus.stats || { totalTrades: 0, totalProfit: 0, successfulTrades: 0 };
        const winRate = engineStats.totalTrades > 0 ? (engineStats.successfulTrades / engineStats.totalTrades * 100).toFixed(1) : '0.0';

        const liveMetrics = {
            mode: engineStatus.mode || 'STOPPED',
            totalTrades: engineStats.totalTrades,
            totalProfit: engineStats.totalProfit.toFixed(4),
            winRate: winRate,
            // Confidence score can be linked to AI optimizer fitness or remain a placeholder
            confidenceScore: aiAutoOptimizer && aiAutoOptimizer.getState ? (aiAutoOptimizer.getState().bestFitness * 10).toFixed(1) : '75.0'
        };

        res.json({ answer, metrics: liveMetrics, suggestedAction });
    } catch (error) {
        console.error('[API] Copilot error:', error);
        res.status(500).json({ error: 'Failed to generate AI response' });
    }
});

/**
 * @route POST /api/copilot/action
 * @desc Execute a file system or system action approved by user
 * @access Private
 */
router.post('/copilot/action', async (req, res) => {
    try {
        if (!fileSystemService || !fileSystemService.executeAction) {
            return res.status(503).json({ 
                success: false, 
                error: 'File system service not available' 
            });
        }
        
        const { action, filePath, content } = req.body;
        const result = await fileSystemService.executeAction(action, { filePath, content });
        res.json(result);
    } catch (error) {
        console.error('[API] Action execution error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/config/wallet
 * @desc Get configured wallet from environment (Render or .env)
 * @access Private
 */
router.get('/config/wallet', (req, res) => {
    try {
        const address = process.env.WALLET_ADDRESS;
        const privateKey = process.env.PRIVATE_KEY;
        
        if (!address) {
            return res.json({ found: false });
        }

        const isRender = process.env.RENDER || process.env.RENDER_SERVICE_ID;
        const source = isRender ? 'Render Environment' : '.env File';

        res.json({
            found: true,
            address,
            // privateKey has been removed from this response for security reasons.
            source
        });
    } catch (error) {
        console.error('[API] Config wallet error:', error);
        res.status(500).json({ error: 'Failed to fetch wallet config' });
    }
});

/**
 * @route GET /api/brain/theoretical-max
 * @desc Get theoretical maximum metrics from Python Oracle
 * @access Private
 */
router.get('/brain/theoretical-max', async (req, res) => {
    try {
        if (!brainConnector || !brainConnector.getTheoreticalMaximum) {
            return res.status(503).json({ 
                error: 'Brain connector service not available' 
            });
        }
        const data = await brainConnector.getTheoreticalMaximum();
        res.json(data || {});
    } catch (error) {
        console.error('[API] Failed to fetch theoretical max:', error);
        res.status(500).json({ error: 'Failed to fetch theoretical max' });
    }
});

/**
 * @route GET /api/competitors/activity
 * @desc Get real-time activity of tracked MEV bots
 * @access Private
 */
router.get('/competitors/activity', async (req, res) => {
    try {
        if (!competitorAnalysis || !competitorAnalysis.getCompetitorActivity) {
            return res.status(503).json({ 
                error: 'Competitor analysis service not available' 
            });
        }
        const data = await competitorAnalysis.getCompetitorActivity();
        res.json(data);
    } catch (error) {
        console.error('[API] Failed to fetch competitor activity:', error);
        res.status(500).json({ error: 'Failed to fetch competitor activity' });
    }
});

/**
 * @route GET /api/engine/status
 * @desc Get current engine status
 * @access Private
 */
router.get('/engine/status', (req, res) => {
    // IA-8 FIX: Query the REAL engine and orchestrator for their status
    try {
        if (!profitEngine || !executionOrchestrator) {
            return res.status(503).json({ 
                error: 'Engine services not available' 
            });
        }
        
        const engineStatus = profitEngine.getStatus();
        const orchestratorStatus = executionOrchestrator.getStatus();
        
        res.json({
            isRunning: orchestratorStatus.isRunning,
            mode: engineStatus.mode,
            ...engineStatus.stats,
            ...orchestratorStatus
        });
    } catch (error) {
        console.error('[API] Failed to get real engine status:', error);
        res.status(500).json({ error: 'Failed to retrieve engine status' });
    }
});

/**
 * @route POST /api/engine/state
 * @desc Start or stop the engine
 * @access Private
 * @param {object} req.body - { action: 'start' | 'stop', mode?: 'LIVE' | 'PAPER' }
 */
router.post('/engine/state', async (req, res) => {
    // IA-8 FIX: Control the REAL engine and orchestrator
    try {
        if (!profitEngine || !executionOrchestrator) {
            return res.status(503).json({ 
                error: 'Engine services not available' 
            });
        }
        
        const { action, mode } = req.body;
        
        if (action === 'start') {
            // Validate mode
            if (mode && (mode !== 'LIVE' && mode !== 'PAPER')) {
                return res.status(400).json({ error: 'Invalid mode. Use LIVE or PAPER' });
            }
            
            if (mode) {
                profitEngine.setMode(mode);
            }
            await profitEngine.start();
            executionOrchestrator.start();
            
            console.log(`[API] Engine start command issued. Mode: ${profitEngine.getMode()}`);
            
            res.json({ success: true, message: `Engine started in ${profitEngine.getMode()} mode.` });

        } else if (action === 'stop') {
            executionOrchestrator.stop();
            // Note: profitEngine doesn't have a stop, it's event-driven. Stopping the orchestrator is sufficient.
            
            console.log('[API] Engine stop command issued.');
            
            res.json({ success: true, message: 'Engine stopped.' });

        } else {
            res.status(400).json({ error: 'Invalid action. Use "start" or "stop".' });
        }
    } catch (error) {
        console.error('[API] Failed to update engine state:', error);
        res.status(500).json({ error: 'Failed to update engine state' });
    }
});

/**
 * @route GET /api/engine/strategies
 * @desc Get active strategies
 * @access Private
 */
router.get('/engine/strategies', (req, res) => {
    try {
        if (!profitEngine) {
            return res.status(503).json({ 
                error: 'Profit engine not available' 
            });
        }
        // IA-8 FIX: Get strategies from the REAL engine
        res.json(profitEngine.getStatus().strategies || []);
    } catch (error) {
        console.error('[API] Failed to get strategies:', error);
        res.status(500).json({ error: 'Failed to get strategies' });
    }
});

/**
 * @route POST /api/engine/strategies
 * @desc Add a strategy
 * @access Private
 */
router.post('/engine/strategies', (req, res) => {
    try {
        if (!profitEngine) {
            return res.status(503).json({ 
                error: 'Profit engine not available' 
            });
        }
        // IA-8 FIX: Reload strategies in the REAL engine
        profitEngine.reloadStrategies();
        res.json(profitEngine.getStatus().strategies);
    } catch (error) {
        console.error('[API] Failed to add strategy:', error);
        res.status(500).json({ error: 'Failed to add strategy' });
    }
});

/**
 * @route DELETE /api/engine/strategies/:name
 * @desc Remove a strategy
 * @access Private
 */
router.delete('/engine/strategies/:name', (req, res) => {
    try {
        // This is a complex operation. For now, we'll just note it's not supported via this mock-like interface.
        res.status(501).json({ error: 'Dynamic strategy removal is not implemented. Please edit strategies.json and reload.' });
    } catch (error) {
        console.error('[API] Failed to remove strategy:', error);
        res.status(500).json({ error: 'Failed to remove strategy' });
    }
});

/**
 * @route GET /api/engine/profit
 * @desc Get profit history
 * @access Private
 */
router.get('/engine/profit', async (req, res) => {
    try {
        if (!tradeAuditService) {
            return res.status(503).json({ 
                error: 'Trade audit service not available' 
            });
        }
        
        const { days = 7 } = req.query;
        
        // Fetch recent trades from the audit service
        const history = await tradeAuditService.getTradeHistory({ limit: 1000 });

        const profitByDay = {};
        const now = new Date();
        const cutoffDate = new Date(now);
        cutoffDate.setDate(now.getDate() - parseInt(days));

        if (history.data) {
            history.data.forEach(trade => {
                const tradeDate = new Date(trade.timestamp);
                if (tradeDate >= cutoffDate) {
                    const dateStr = tradeDate.toISOString().split('T')[0];
                    if (!profitByDay[dateStr]) {
                        profitByDay[dateStr] = { profit: 0, loss: 0 };
                    }
                    if (trade.status === 'success' && trade.profit > 0) {
                        profitByDay[dateStr].profit += parseFloat(trade.profit);
                    } else if (trade.status === 'failed' || (trade.profit && trade.profit <= 0)) {
                        // Represent loss as a positive number for the chart
                        profitByDay[dateStr].loss += Math.abs(parseFloat(trade.profit || 0));
                    }
                }
            });
        }

        // Format data for charting, ensuring all days in the range are present
        const profitData = [];
        for (let i = parseInt(days) - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            profitData.push({
                date: dateStr,
                profit: profitByDay[dateStr]?.profit || 0,
                loss: profitByDay[dateStr]?.loss || 0
            });
        }

        res.json(profitData);
    } catch (error) {
        console.error('[API] Failed to get profit history:', error);
        res.status(500).json({ error: 'Failed to get profit history' });
    }
});

// --- Stats & Deployments ---
// =======================================================================================
/**
 * @route GET /api/stats
 * @desc Get trading statistics
 * @access Private
 */
router.get('/stats', async (req, res) => {
    try {
        if (!profitEngine) {
            return res.status(503).json({ 
                error: 'Profit engine not available' 
            });
        }
        
        // Integrate with real engine stats
        const engineStatus = profitEngine.getStatus();
        const engineStats = engineStatus.stats || { totalTrades: 0, totalProfit: 0, successfulTrades: 0 };
        
        res.json({
            totalRequests: 0, // This should come from a proper metrics collector
            successfulTrades: engineStats.successfulTrades,
            failedTrades: engineStats.totalTrades - engineStats.successfulTrades,
            totalProfit: engineStats.totalProfit,
            gasSpent: 0, // This should be aggregated from the trade audit history
            lastUpdate: new Date().toISOString()
        });
    } catch (error) {
        console.error('[API] Failed to get stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

/**
 * @route GET /api/deployments
 * @desc Get all deployments
 * @access Private
 */
router.get('/deployments', (req, res) => {
    try {
        deploymentPersistenceService.getAll()
            .then(deployments => res.json(deployments))
            .catch(err => { throw err; });
    } catch (error) {
        console.error('[API] Failed to get deployments:', error);
        res.status(500).json({ error: 'Failed to get deployments' });
    }
});

/**
 * @route POST /api/deployments
 * @desc Create a new deployment
 * @access Private
 */
router.post('/deployments', (req, res) => {
    try {
        const { name, type, config } = req.body;
        const newDeployment = {
            id: `deploy_${Date.now()}`,
            name,
            type,
            config,
            status: 'stopped',
            createdAt: new Date().toISOString()
        };
        deploymentPersistenceService.create(newDeployment)
            .then(created => res.status(201).json(created))
            .catch(err => { throw err; });
    } catch (error) {
        console.error('[API] Failed to create deployment:', error);
        res.status(500).json({ error: 'Failed to create deployment' });
    }
});

/**
 * @route GET /api/deployments/:id
 * @desc Get deployment by ID
 * @access Private
 */
router.get('/deployments/:id', (req, res) => {
    try {
        const { id } = req.params;
        deploymentPersistenceService.getById(id)
            .then(deployment => {
                if (!deployment) return res.status(404).json({ error: 'Deployment not found' });
                res.json(deployment);
            })
            .catch(err => { throw err; });
    } catch (error) {
        console.error('[API] Failed to get deployment:', error);
        res.status(500).json({ error: 'Failed to get deployment' });
    }
});

/**
 * @route POST /api/deployments/:id/restart
 * @desc Restart deployment
 * @access Private
 */
router.post('/deployments/:id/restart', (req, res) => {
    try {
        const { id } = req.params;
        deploymentPersistenceService.update(id, { 
            status: 'running', 
            lastRestart: new Date().toISOString() 
        })
        .then(updated => {
            if (!updated) return res.status(404).json({ error: 'Deployment not found' });
            res.json(updated);
        })
        .catch(err => { throw err; });
    } catch (error) {
        console.error('[API] Failed to restart deployment:', error);
        res.status(500).json({ error: 'Failed to restart deployment' });
    }
});

/**
 * @route POST /api/deployments/:id/stop
 * @desc Stop deployment
 * @access Private
 */
router.post('/deployments/:id/stop', (req, res) => {
    try {
        const { id } = req.params;
        deploymentPersistenceService.update(id, { status: 'stopped' })
            .then(updated => {
                if (!updated) return res.status(404).json({ error: 'Deployment not found' });
                res.json(updated);
            })
            .catch(err => { throw err; });
    } catch (error) {
        console.error('[API] Failed to stop deployment:', error);
        res.status(500).json({ error: 'Failed to stop deployment' });
    }
});

/**
 * @route GET /api/deployments/stats
 * @desc Get deployment statistics
 * @access Private
 */
router.get('/deployments/stats', (req, res) => {
    try {
        deploymentPersistenceService.getAll()
            .then(deployments => {
                res.json({
                    total: deployments.length,
                    running: deployments.filter(d => d.status === 'running').length,
                    stopped: deployments.filter(d => d.status === 'stopped').length,
                    failed: deployments.filter(d => d.status === 'failed').length
                });
            })
            .catch(err => { throw err; });
    } catch (error) {
        console.error('[API] Failed to get deployment stats:', error);
        res.status(500).json({ error: 'Failed to get deployment stats' });
    }
});

/**
 * @route GET /api/deployments/health
 * @desc Get deployment health
 * @access Private
 */
router.get('/deployments/health', (req, res) => {
    try {
        deploymentPersistenceService.getAll()
            .then(deployments => {
                res.json({
                    status: 'healthy',
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString(),
                    deployments: {
                        total: deployments.length,
                        healthy: deployments.filter(d => d.status === 'running').length
                    }
                });
            })
            .catch(err => { throw err; });
    } catch (error) {
        console.error('[API] Failed to get health:', error);
        res.status(500).json({ error: 'Failed to get health' });
    }
});

// --- Wallet Management ---
// IA-9 FIX: The volatile in-memory wallet store has been removed.
// All wallet operations are now handled by the persistent WalletPersistenceService.

/**
 * @route GET /api/wallets
 * @desc Get all wallets
 * @access Private
 */
router.get('/wallets', (req, res) => {
    try {
        const wallets = walletPersistenceService.getAllWallets();
        res.json(wallets);
    } catch (error) {
        console.error('[API] Failed to get wallets:', error);
        res.status(500).json({ error: 'Failed to get wallets' });
    }
});

/**
 * @route POST /api/wallets
 * @desc Add a new wallet
 * @access Private
 */
router.post('/wallets', (req, res) => {
    // This endpoint is deprecated in favor of /wallets/add which includes the key
    try {
        const { address, privateKey, name, chain } = req.body;
        const newWallet = walletPersistenceService.saveWallet(address, privateKey, chain);
        res.status(201).json(newWallet);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add wallet' });
    }
});

/**
 * @route POST /api/wallets/add
 * @desc Add wallet with private key
 * @access Private
 */
router.post('/wallets/add', (req, res) => {
    try {
        const { address, privateKey, name, chain } = req.body; // Name is not persisted yet
        const wallet = walletPersistenceService.saveWallet(address, privateKey, chain);
        res.status(201).json(wallet);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add wallet' });
    }
});

/**
 * @route DELETE /api/wallets/:id
 * @desc Remove wallet
 * @access Private
 */
router.delete('/wallets/:address', (req, res) => {
    try {
        const { address } = req.params;
        walletPersistenceService.deleteWallet(address);
        res.json({ success: true });
    } catch (error) {
        console.error('[API] Failed to remove wallet:', error);
        res.status(500).json({ error: 'Failed to remove wallet' });
    }
});

/**
 * @route GET /api/wallets/:address/balance
 * @desc Get wallet balance
 * @access Private
 */
router.get('/wallets/:address/balance', (req, res) => {
    try {
        const { address } = req.params; 
        const wallet = walletPersistenceService.getWallet(address);
        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }
        res.json({
            balance: wallet.balance,
            lastUpdate: new Date().toISOString()
        });
    } catch (error) {
        console.error('[API] Failed to get balance:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});

/**
 * @route GET /api/wallets/validate
 * @desc Validate wallet address
 * @access Private
 */
router.get('/wallets/validate', (req, res) => {
    try {
        const { address } = req.query;
        // Basic Ethereum address validation
        const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
        res.json({
            valid: isValid,
            chain: isValid ? 'ethereum' : null
        });
    } catch (error) {
        console.error('[API] Failed to validate wallet:', error);
        res.status(500).json({ error: 'Failed to validate wallet' });
    }
});

/**
 * @route POST /api/wallets/verify-key
 * @desc Verify private key and get address
 * @access Private
 */
router.post('/wallets/verify-key', (req, res) => {
    try {
        const { privateKey } = req.body;
        
        if (!privateKey) {
            return res.status(400).json({ error: 'Invalid private key' });
        }

        // Real cryptographic derivation
        // This validates the key format and derives the actual address
        const wallet = new ethers.Wallet(privateKey);
        
        res.json({ address: wallet.address });
    } catch (error) {
        console.error('[API] Failed to verify key:', error);
        res.status(500).json({ error: 'Failed to verify key' });
    }
});

/**
 * @route POST /api/wallets/import
 * @desc Bulk import wallets
 * @access Private
 */
router.post('/wallets/import', (req, res) => {
    try {
        // This is a bulk operation, better handled by a dedicated service method
        res.status(501).json({ error: 'Bulk import not implemented. Please add wallets individually.' });
    } catch (error) {
        console.error('[API] Failed to import wallets:', error);
        res.status(500).json({ error: 'Failed to import wallets' });
    }
});

// --- History ---

/**
 * @route POST /api/executeTrade
 * @desc Execute a manual trade
 * @access Private
 */
router.post('/executeTrade', async (req, res) => {
    try {
        const { tokenIn, tokenOut, amountIn, dex, chain } = req.body;

        // Input Validation
        if (!tokenIn || !tokenIn.startsWith('0x') || tokenIn.length !== 42) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Invalid tokenIn address' });
        }
        if (tokenOut && (!tokenOut.startsWith('0x') || tokenOut.length !== 42)) {
             return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Invalid tokenOut address' });
        }
        if (!amountIn || amountIn <= 0) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Amount must be positive' });
        }
        
        const validDexes = ['uniswap_v3', 'sushiswap', 'curve', 'balancer', 'pancakeswap', 'quickswap'];
        if (dex && !validDexes.includes(dex) && dex !== 'auto') {
            return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Invalid DEX selected' });
        }

        // Construct opportunity for the engine
        const opportunity = {
            txHash: `manual_${Date.now()}`,
            pair: `${tokenIn}-${tokenOut || '??'}`,
            strategy: { name: 'Manual Trade', risk: 'Manual' },
            profit: 0,
            timestamp: Date.now(),
            chainId: chain || 'ethereum',
            dex: dex || 'uniswap_v3',
            manualParams: { tokenIn, tokenOut, amountIn },
            isManual: true
        };

        // Queue execution via Orchestrator
        executionOrchestrator.queueOpportunity(opportunity);

        res.json({ 
            success: true, 
            message: 'Trade execution queued', 
            tradeId: opportunity.txHash 
        });

    } catch (error) {
        console.error('[API] Trade execution error:', error);
        res.status(500).json({ error: 'Failed to execute trade' });
    }
});

/**
 * @route GET /api/history
 * @desc Get trading history
 * @access Private
 */
router.get('/history', async (req, res) => {
    try {
        const { page, limit, strategy, status } = req.query;
        const history = await tradeAuditService.getTradeHistory({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 50,
            strategy,
            status
        });
        res.json(history);
    } catch (error) {
        console.error('[API] Failed to get history:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

// --- Copilot Settings ---

/**
 * @route POST /api/copilot/settings
 * @desc Update copilot settings
 * @access Private
 */
router.post('/copilot/settings', (req, res) => {
    try {
        const settings = req.body;
        // In production, save to database
        console.log('[API] Copilot settings updated:', settings);
        res.json({ success: true, settings });
    } catch (error) {
        console.error('[API] Failed to update copilot settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;