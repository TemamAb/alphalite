import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { Bot, Send, Sparkles, ShieldAlert, Save, Shield, Crosshair, Brain, Zap, Layout, Code, Wand2, PlayCircle, CheckCircle, RotateCcw } from 'lucide-react';
import CodeEditor from './CodeEditor';

interface CopilotResponse {
    answer: string;
    code?: string;
    language?: string;
    executable?: boolean;
    targetFile?: string;
    metrics: {
        mode: string;
        totalTrades: number;
        totalProfit: number;
        winRate: string;
        confidenceScore: string;
    };
    settings?: {
        autoPauseEnabled: boolean;
        minConfidenceThreshold: number;
    };
}

const AlphaCopilot: React.FC = () => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState<CopilotResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [autoPause, setAutoPause] = useState(false);
    const [threshold, setThreshold] = useState(60);
    const [selectedPersona, setSelectedPersona] = useState('auto');
    const [executing, setExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<string | null>(null);
    const [canApply, setCanApply] = useState(false);
    const [restorePoint, setRestorePoint] = useState<string | null>(null);
    const { token } = useAuthStore.getState();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const askCopilot = async (question: string) => {
        setLoading(true);
        setExecutionResult(null); // Clear previous execution result
        setCanApply(false);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const res = await fetch(`${API_URL}/api/copilot?question=${encodeURIComponent(question)}&persona=${selectedPersona}`, { headers });
            const data = await res.json();
            setResponse(data);
            if (data.settings) {
                setAutoPause(data.settings.autoPauseEnabled);
                setThreshold(data.settings.minConfidenceThreshold);
            }
        } catch (error) {
            console.error("Copilot error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Initial analysis on load
    useEffect(() => {
        askCopilot("status");
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            askCopilot(query);
            setQuery('');
        }
    };

    const saveSettings = async () => {
        try {
            const headers = { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            await fetch(`${API_URL}/api/copilot/settings`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ autoPauseEnabled: autoPause, minConfidenceThreshold: threshold })
            });
            // Refresh data to confirm
            askCopilot("status");
        } catch (error) {
            console.error("Failed to save settings:", error);
        }
    };

    const handleExecuteCode = async (mode: 'SIMULATE' | 'APPLY' = 'SIMULATE') => {
        if (!response?.code || !response.targetFile) return;

        setExecuting(true);
        if (mode === 'SIMULATE') setExecutionResult(null);
        try {
            const headers = { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            const res = await fetch(`${API_URL}/api/execute-code`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ code: response.code, targetFile: response.targetFile, mode })
            });
            const data = await res.json();
            
            if (mode === 'SIMULATE') {
                setExecutionResult(data.success ? `✅ SIMULATION: ${data.message}` : `❌ ERROR: ${data.error || 'Execution failed.'}`);
                if (data.success) setCanApply(true);
            } else {
                setExecutionResult(data.success ? `🚀 APPLIED: ${data.message}` : `❌ ERROR: ${data.error || 'Apply failed.'}`);
                if (data.success && data.restorePoint) setRestorePoint(data.restorePoint);
                setCanApply(false); // Hide apply button after success
            }

        } catch (error) {
            console.error("Code execution error:", error);
            setExecutionResult('❌ Network error during execution.');
        } finally {
            setExecuting(false);
        }
    };

    const handleRestore = async () => {
        if (!restorePoint) return;
        setExecuting(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            const res = await fetch(`${API_URL}/api/restore-point`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ restoreId: restorePoint })
            });
            const data = await res.json();
            setExecutionResult(data.success ? `⏪ RESTORED: ${data.message}` : `❌ ERROR: ${data.error}`);
            if (data.success) setRestorePoint(null);
        } catch (error) {
            setExecutionResult('❌ Restore failed.');
        } finally {
            setExecuting(false);
        }
    };

    const suggestions = [
        "Is the system ready for deployment?",
        "Analyze current risk levels",
        "Project monthly profit",
        "How is the win rate trending?"
    ];

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 bg-gradient-to-br rounded-xl shadow-lg ${
                    selectedPersona === 'sentinel' ? 'from-green-500 to-emerald-700 shadow-green-500/20' :
                    selectedPersona === 'sniper' ? 'from-red-500 to-orange-700 shadow-red-500/20' :
                    selectedPersona === 'optimizer' ? 'from-yellow-500 to-amber-600 shadow-yellow-500/20' :
                    selectedPersona === 'architect' ? 'from-cyan-500 to-blue-600 shadow-cyan-500/20' :
                    selectedPersona === 'engineer' ? 'from-orange-500 to-red-600 shadow-orange-500/20' :
                    selectedPersona === 'auto' ? 'from-slate-700 to-slate-900 shadow-slate-500/20' :
                    'from-indigo-500 to-purple-600 shadow-purple-500/20'
                }`}>
                    {selectedPersona === 'sentinel' ? <Shield className="w-8 h-8 text-white" /> :
                     selectedPersona === 'sniper' ? <Crosshair className="w-8 h-8 text-white" /> :
                     selectedPersona === 'optimizer' ? <Zap className="w-8 h-8 text-white" /> :
                     selectedPersona === 'architect' ? <Layout className="w-8 h-8 text-white" /> :
                     selectedPersona === 'engineer' ? <Code className="w-8 h-8 text-white" /> :
                     selectedPersona === 'auto' ? <Wand2 className="w-8 h-8 text-white" /> :
                     <Brain className="w-8 h-8 text-white" />}
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Alpha Copilot</h1>
                    <p className="text-gray-500 dark:text-gray-400">AI-Powered Trading Assistant & Analyst</p>
                </div>
            </div>

            {/* Persona Selector */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                <button 
                    onClick={() => setSelectedPersona('auto')}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedPersona === 'auto' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                >
                    <Wand2 className="w-5 h-5" />
                    <span className="font-bold text-xs">Auto</span>
                </button>
                <button 
                    onClick={() => setSelectedPersona('strategist')}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedPersona === 'strategist' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 text-purple-600 dark:text-purple-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                >
                    <Brain className="w-5 h-5" />
                    <span className="font-bold text-xs">Strategist</span>
                </button>
                <button 
                    onClick={() => setSelectedPersona('sentinel')}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedPersona === 'sentinel' ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-600 dark:text-green-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                >
                    <Shield className="w-5 h-5" />
                    <span className="font-bold text-xs">Sentinel</span>
                </button>
                <button 
                    onClick={() => setSelectedPersona('sniper')}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedPersona === 'sniper' ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                >
                    <Crosshair className="w-5 h-5" />
                    <span className="font-bold text-xs">Sniper</span>
                </button>
                <button 
                    onClick={() => setSelectedPersona('optimizer')}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedPersona === 'optimizer' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                >
                    <Zap className="w-5 h-5" />
                    <span className="font-bold text-xs">Optimizer</span>
                </button>
                <button 
                    onClick={() => setSelectedPersona('architect')}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedPersona === 'architect' ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                >
                    <Layout className="w-5 h-5" />
                    <span className="font-bold text-xs">Architect</span>
                </button>
                <button 
                    onClick={() => setSelectedPersona('engineer')}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedPersona === 'engineer' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-600 dark:text-orange-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                >
                    <Code className="w-5 h-5" />
                    <span className="font-bold text-xs">Engineer</span>
                </button>
            </div>

            {/* Safety Controls */}
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="w-6 h-6 text-red-500" />
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-red-100">Automated Safety Stop</h3>
                        <p className="text-xs text-gray-500 dark:text-red-200/70">Pause trading if confidence drops below threshold</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Threshold: {threshold}%</span>
                        <input 
                            type="range" 
                            min="10" 
                            max="95" 
                            value={threshold} 
                            onChange={(e) => setThreshold(parseInt(e.target.value))}
                            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-red-500"
                        />
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={autoPause} onChange={(e) => setAutoPause(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                    </label>

                    <button onClick={saveSettings} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
                        <Save className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Chat / Response Area */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 min-h-[300px] flex flex-col justify-center">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center space-y-4 text-gray-400 animate-pulse">
                            <Sparkles className="w-12 h-12" />
                            <p>Analyzing market data & engine metrics...</p>
                        </div>
                    ) : response ? (
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                {selectedPersona === 'sentinel' ? <Shield className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" /> :
                                 selectedPersona === 'sniper' ? <Crosshair className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" /> :
                                 selectedPersona === 'optimizer' ? <Zap className="w-6 h-6 text-yellow-500 mt-1 flex-shrink-0" /> :
                                 selectedPersona === 'architect' ? <Layout className="w-6 h-6 text-cyan-500 mt-1 flex-shrink-0" /> :
                                 selectedPersona === 'engineer' ? <Code className="w-6 h-6 text-orange-500 mt-1 flex-shrink-0" /> :
                                 selectedPersona === 'auto' ? <Wand2 className="w-6 h-6 text-slate-400 mt-1 flex-shrink-0" /> :
                                 <Brain className="w-6 h-6 text-purple-500 mt-1 flex-shrink-0" />
                                }
                                <div className="space-y-2 flex-1">
                                    <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
                                        {response.answer}
                                    </p>

                                    {response.code && (
                                        <>
                                            <CodeEditor code={response.code} language={response.language || 'javascript'} />
                                            {response.executable && (
                                                <div className="mt-4">
                                                    <div className="flex gap-3">
                                                        <button 
                                                            onClick={() => handleExecuteCode('SIMULATE')}
                                                            disabled={executing}
                                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
                                                        >
                                                            <PlayCircle className="w-5 h-5" />
                                                            {executing && !canApply ? 'Simulating...' : 'Simulate Patch'}
                                                        </button>
                                                        
                                                        {canApply && (
                                                            <button 
                                                                onClick={() => handleExecuteCode('APPLY')}
                                                                disabled={executing}
                                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait animate-in fade-in zoom-in duration-300"
                                                            >
                                                                <CheckCircle className="w-5 h-5" />
                                                                Apply to LIVE
                                                            </button>
                                                        )}
                                                    </div>

                                                    {executionResult && (
                                                        <p className={`mt-2 text-sm font-mono ${executionResult.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                                                            {executionResult}
                                                        </p>
                                                    )}

                                                    {restorePoint && (
                                                        <button onClick={handleRestore} className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-200 text-sm rounded-lg transition-colors">
                                                            <RotateCcw className="w-4 h-4" /> Restore System (Undo Changes)
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    
                                    {/* Metrics Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <div className="text-xs text-gray-500 uppercase">Confidence</div>
                                            <div className={`text-xl font-bold ${Number(response.metrics.confidenceScore) > 70 ? 'text-green-500' : 'text-yellow-500'}`}>
                                                {response.metrics.confidenceScore}%
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <div className="text-xs text-gray-500 uppercase">Win Rate</div>
                                            <div className="text-xl font-bold text-blue-500">{response.metrics.winRate}%</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <div className="text-xs text-gray-500 uppercase">Total Profit</div>
                                            <div className="text-xl font-bold text-green-500">{response.metrics.totalProfit.toFixed(4)} ETH</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <div className="text-xs text-gray-500 uppercase">Mode</div>
                                            <div className="text-xl font-bold text-purple-500">{response.metrics.mode}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <Bot className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Ask me anything about the trading engine's performance.</p>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                        {suggestions.map((s, i) => (
                            <button key={i} onClick={() => askCopilot(s)} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full hover:border-purple-500 transition-colors whitespace-nowrap text-gray-600 dark:text-gray-300">
                                {s}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={handleSubmit} className="relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask Alpha Copilot..."
                            className="w-full pl-4 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                        />
                        <button type="submit" disabled={!query.trim() || loading} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AlphaCopilot;