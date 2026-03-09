import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores';
import { Bot, Send, Sparkles, ShieldAlert, Save, Shield, Crosshair, Brain, Zap, Layout, Code, Wand2, PlayCircle, CheckCircle, RotateCcw, Activity, Terminal, Cpu, Search, AlertTriangle, BarChart3, Lock, Eye, Network, Settings, FileCode, Trash2, RefreshCw } from 'lucide-react';
import CodeEditor from './CodeEditor';
import IntelligenceFeed from './IntelligenceFeed';
import PersonaSelector from './PersonaSelector';
import CopilotSettings from './CopilotSettings';
import PersonaHUD from './PersonaHUD';
import CopilotHeader from './CopilotHeader';

interface CopilotResponse {
    answer: string;
    code?: string;
    language?: string;
    executable?: boolean;
    targetFile?: string;
    suggestedAction?: {
        action: 'create' | 'update' | 'delete' | 'read' | 'system_update' | 'restore';
        filePath?: string;
        content?: string;
    };
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
    const [showSettings, setShowSettings] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState('openai');
    
    // Use a reactive selector to get the token
    const token = useAuthStore((state) => state.token);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const askCopilot = async (question: string) => {
        setLoading(true);
        setExecutionResult(null); // Clear previous execution result
        setCanApply(false);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const res = await fetch(`${API_URL}/api/copilot?question=${encodeURIComponent(question)}&persona=${selectedPersona}&provider=${selectedProvider}`, { headers });
            const data = await res.json();
            setResponse(data);
            if (data.settings) {
                setAutoPause(data.settings.autoPauseEnabled);
                setThreshold(data.settings.minConfidenceThreshold);
            }
            // If there's a suggested action, enable the apply button logic
            if (data.suggestedAction) {
                setCanApply(true);
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

    const handleExecuteAction = async () => {
        if (!response?.suggestedAction) return;

        setExecuting(true);
        try {
            const headers = { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            
            const res = await fetch(`${API_URL}/api/copilot/action`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: response.suggestedAction.action,
                    filePath: response.suggestedAction.filePath,
                    content: response.suggestedAction.content
                })
            });
            const data = await res.json();
            
            setExecutionResult(data.success ? `✅ SUCCESS: ${data.message}` : `❌ ERROR: ${data.error || 'Action failed.'}`);
            if (data.success) {
                setCanApply(false);
                // If it was a system update, maybe show a specific message
                if (response.suggestedAction.action === 'system_update') {
                    setExecutionResult('🚀 System update triggered. Service may restart.');
                }
            }

        } catch (error) {
            console.error("Code execution error:", error);
            setExecutionResult('❌ Network error during execution.');
        } finally {
            setExecuting(false);
        }
    };

    const handleRestore = async () => {
        setExecuting(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            // Use the new action endpoint for restore
            const res = await fetch(`${API_URL}/api/copilot/action`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'restore' })
            });
            const data = await res.json();
            setExecutionResult(data.success ? `⏪ RESTORED: ${data.message}` : `❌ ERROR: ${data.error}`);
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

    const renderActionPreview = () => {
        if (!response?.suggestedAction) return null;
        const { action, filePath, content } = response.suggestedAction;

        return (
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 mb-2 text-sm font-bold text-white">
                    {action === 'create' && <FileCode className="w-4 h-4 text-green-400" />}
                    {action === 'update' && <FileCode className="w-4 h-4 text-blue-400" />}
                    {action === 'delete' && <Trash2 className="w-4 h-4 text-red-400" />}
                    {action === 'system_update' && <RefreshCw className="w-4 h-4 text-purple-400" />}
                    <span className="uppercase">{action} ACTION PROPOSED</span>
                </div>
                {filePath && <div className="text-xs text-slate-400 font-mono mb-2">{filePath}</div>}
                {content && <CodeEditor code={content} language="javascript" />}
            </div>
        );
    };

    return (
        <div className="p-4 max-w-6xl mx-auto space-y-4 h-[calc(100vh-100px)] flex flex-col">
            <CopilotHeader 
                selectedPersona={selectedPersona}
                selectedProvider={selectedProvider}
                onProviderChange={setSelectedProvider}
                onOpenSettings={() => setShowSettings(true)}
            />

            {/* Persona Selector */}
            <PersonaSelector selectedPersona={selectedPersona} onSelect={setSelectedPersona} />

            {/* Main Intelligence Area */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
                
                {/* Left Column: Live Intelligence Feed */}
                <IntelligenceFeed persona={selectedPersona} className="lg:col-span-1" />

                {/* Right Column: Interaction Terminal */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        <PersonaHUD selectedPersona={selectedPersona} />
                        
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

                                    {/* Render Suggested Action Preview */}
                                    {renderActionPreview()}

                                    {/* Action Buttons */}
                                    {response.suggestedAction && (
                                        <>
                                            <div className="mt-4">
                                                <div className="flex gap-3">
                                                    {canApply && (
                                                            <button 
                                                                onClick={handleExecuteAction}
                                                                disabled={executing}
                                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait animate-in fade-in zoom-in duration-300"
                                                            >
                                                                <CheckCircle className="w-5 h-5" />
                                                                APPROVE & EXECUTE
                                                            </button>
                                                        )}
                                                </div>

                                                {executionResult && (
                                                    <p className={`mt-2 text-sm font-mono ${executionResult.startsWith('✅') || executionResult.startsWith('🚀') ? 'text-green-400' : 'text-red-400'}`}>
                                                        {executionResult}
                                                    </p>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* Always show Restore button if not executing an action */}
                                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                                        <button onClick={handleRestore} disabled={executing} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-800/50 text-red-300 text-sm rounded-lg transition-colors disabled:opacity-50">
                                            <RotateCcw className="w-4 h-4" /> 
                                            Emergency Restore (Git Reset)
                                        </button>
                                    </div>
                                    
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
                            <Terminal className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Awaiting command input. Select a persona to begin analysis.</p>
                        </div>
                    )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 shrink-0">
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
                                placeholder={`Command ${selectedPersona.toUpperCase()}...`}
                                className="w-full pl-4 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white font-mono text-sm"
                            />
                            <button type="submit" disabled={!query.trim() || loading} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <CopilotSettings 
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                autoPause={autoPause}
                setAutoPause={setAutoPause}
                threshold={threshold}
                setThreshold={setThreshold}
                onSave={saveSettings}
            />
        </div>
    );
};

export default AlphaCopilot;