import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { useAuthStore } from '@/stores';
import CollapsiblePanel from './CollapsiblePanel';
import Tooltip from './Tooltip'; // Assuming Tooltip component exists
import { Info, Wand2, ChevronLeft, ChevronRight } from 'lucide-react';
import AIConfig from './AIConfig';
import CompetitorMonitor from './CompetitorMonitor';

// --- Type Definitions ---
interface LatencyMetrics {
    internalCacheLookup: number;
    apiHotPath: number;
    blockEventDetection: number;
    executionPath: number;
    externalDataFetch: number;
    lastUpdate: string;
}

interface Competitor {
    rank: number;
    name: string;
    ppt: number;
    velocity: number;
    isAlphaPro: boolean;
}

interface AIGenome {
    chain: Record<string, number>;
    dex: Record<string, number>;
    pair: Record<string, number>;
}

interface AIOptimizerState {
    generation: number;
    bestFitness: number;
    currentWeights: AIGenome;
    history: {
        generation: number;
        fitness: number;
        timestamp: number;
        source: string;
        composition?: {
            selfLearning: number;
            competitorForging: number;
        };
    }[];
}

interface TheoreticalMax {
    theoretical_max_ppt: number;
    theoretical_max_velocity: number;
    confidence: number;
}

// --- Main Component ---
const AIOptimizer: React.FC = () => {
    const [latency, setLatency] = useState<LatencyMetrics | null>(null);
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [aiState, setAiState] = useState<AIOptimizerState | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);
    const [theoreticalMax, setTheoreticalMax] = useState<TheoreticalMax | null>(null);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(5);
    const { token } = useAuthStore();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const fetchData = async () => {
        const headers = { 'Authorization': `Bearer ${token}` };
        try {
            const [latencyRes, benchmarkRes, aiRes, theoryRes] = await Promise.all([
                fetch(`${API_URL}/api/metrics/latency`, { headers }),
                fetch(`${API_URL}/api/benchmark`, { headers }),
                fetch(`${API_URL}/api/ai/optimizer`, { headers }),
                fetch(`${API_URL}/api/brain/theoretical-max`, { headers }).catch(() => ({ ok: false, json: async () => null })) as Promise<Response>,
            ]);

            setLatency(await latencyRes.json());
            setCompetitors((await benchmarkRes.json()).sort((a: Competitor, b: Competitor) => a.rank - b.rank));
            setAiState(await aiRes.json());
            if (theoryRes.ok) setTheoreticalMax(await theoryRes.json());

        } catch (error) {
            console.error("Failed to fetch optimizer data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const handleTriggerOptimization = async () => {
        setIsTriggering(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            // This endpoint needs to be created in the backend API to call the triggerOptimization method
            await fetch(`${API_URL}/api/ai/optimizer/trigger`, { method: 'POST', headers });
            // Refresh data after a short delay to allow the backend to process
            setTimeout(fetchData, 1500);
        } catch (error) {
            console.error("Failed to trigger optimization:", error);
        } finally {
            // Keep the loading state for a bit to give user feedback
            setTimeout(() => setIsTriggering(false), 1500);
        }
    };

    if (loading) {
        return <div className="p-6 text-gray-500">Loading AI & Performance Data...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">AI Optimization & Performance</h1>
                <button onClick={handleTriggerOptimization} disabled={isTriggering} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait">
                    <Wand2 className={`w-4 h-4 ${isTriggering ? 'animate-spin' : ''}`} />
                    {isTriggering ? 'Evolving...' : 'Evolve Now'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Latency & Competitors */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Latency Metrics Panel */}
                    <CollapsiblePanel title="HFT Latency Breakdown" defaultExpanded={true}>
                        <div className="p-4 space-y-3">
                            {latency && Object.entries(latency).filter(([key]) => key !== 'lastUpdate').map(([key, value]) => {
                                const latencyValue = Number(value);
                                const color = latencyValue > 200 ? 'text-red-500' : latencyValue > 50 ? 'text-yellow-500' : 'text-green-500';
                                const tooltipText = getLatencyTooltip(key);

                                return (
                                    <div key={key} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                            <Tooltip content={tooltipText}>
                                                <Info className="w-3 h-3 ml-2 text-gray-500 cursor-help" />
                                            </Tooltip>
                                        </span>
                                        <span className={`text-lg font-bold ${color}`}>
                                            {latencyValue.toFixed(2)} ms
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CollapsiblePanel>

                    {/* Competitive Benchmark Panel */}
                    <CollapsiblePanel title="Competitive Benchmark" defaultExpanded={true}>
                        <div className="p-4">
                            <table className="w-full text-left">
                                <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="p-3 text-sm font-semibold text-gray-500">Rank</th>
                                        <th className="p-3 text-sm font-semibold text-gray-500">Name</th>
                                        <th className="p-3 text-sm font-semibold text-gray-500 text-right">Profit/Trade (ETH)</th>
                                        <th className="p-3 text-sm font-semibold text-gray-500 text-right">Velocity (Trades/Hr)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {competitors.map((c) => (
                                        <tr key={c.rank} className={`border-b border-gray-100 dark:border-gray-700/50 ${c.isAlphaPro ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                            <td className={`p-3 font-bold ${c.isAlphaPro ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>{c.rank}</td>
                                            <td className={`p-3 font-bold ${c.isAlphaPro ? 'text-blue-600' : 'text-gray-800 dark:text-gray-200'}`}>{c.name}</td>
                                            <td className="p-3 font-mono text-right text-green-600 dark:text-green-400">{c.ppt.toFixed(4)}</td>
                                            <td className="p-3 font-mono text-right text-purple-600 dark:text-purple-400">{c.velocity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CollapsiblePanel>

                    {/* Competitor Monitor Panel */}
                    <CompetitorMonitor />
                </div>

                {/* Column 2: AI Optimizer State */}
                <div className="lg:col-span-1 space-y-6">
                    <CollapsiblePanel title="AI Evolution Engine" defaultExpanded={true}>
                        <div className="p-4">
                            {aiState && (
                                <div className="space-y-6">
                                    {/* Core Metrics */}
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <div className="text-xs text-gray-500">Generation</div>
                                            <div className="text-2xl font-bold text-blue-500">{aiState.generation}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500">Best Fitness</div>
                                            <div className="text-2xl font-bold text-green-500">{aiState.bestFitness.toFixed(4)}</div>
                                        </div>
                                    </div>

                                    {/* Theoretical Maximums (Oracle Data) */}
                                    {theoreticalMax && (
                                        <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-md">
                                            <h4 className="text-xs font-bold text-purple-400 mb-2 uppercase">Theoretical Maximums (Oracle)</h4>
                                            <div className="grid grid-cols-2 gap-4 text-center">
                                                <div>
                                                    <div className="text-[10px] text-slate-400">Max PPT</div>
                                                    <div className="text-lg font-mono font-bold text-white">${theoreticalMax.theoretical_max_ppt.toFixed(2)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-slate-400">Max Velocity</div>
                                                    <div className="text-lg font-mono font-bold text-white">{theoreticalMax.theoretical_max_velocity.toFixed(0)}/hr</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Current Genome */}
                                    <div>
                                        <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Current Genome (Weights)</h3>
                                        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md space-y-2 text-xs font-mono">
                                            {Object.entries(aiState.currentWeights).map(([category, weights]) => (
                                                <div key={category}>
                                                    <div className="font-bold capitalize text-gray-500">{category}:</div>
                                                    <div className="pl-2 grid grid-cols-2 gap-x-4">
                                                        {Object.entries(weights).map(([key, value]) => (
                                                            <div key={key} className="flex justify-between">
                                                                <span className="text-gray-400">{key.replace('Weight', '')}:</span>
                                                                <span className="text-gray-200">{Number(value).toFixed(3)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Evolution History */}
                                    <div>
                                        <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Recent Generations</h3>
                                        <div className="space-y-1">
                                            {aiState.history.slice().reverse().slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize).map(h => (
                                                <div key={h.generation} className="flex flex-col p-2 bg-gray-50 dark:bg-gray-900/50 rounded gap-2">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <div className="font-bold text-gray-500">Gen {h.generation}</div>
                                                        <div className="flex items-center">
                                                            <span className="mr-2 text-gray-400">Fitness:</span>
                                                            <span className="font-mono text-green-500">{h.fitness.toFixed(4)}</span>
                                                        </div>
                                                        <div className={`px-2 py-0.5 rounded-full text-white text-xs ${h.source === 'Self-Learning' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                                                            {h.source.split('-')[0]}
                                                        </div>
                                                    </div>
                                                    {h.composition && (
                                                        <div className="w-full">
                                                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                                                <span>Self-Learning: {h.composition.selfLearning.toFixed(1)}%</span>
                                                                <span>Competitor Forging: {h.composition.competitorForging.toFixed(1)}%</span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
                                                                <div className="bg-blue-500 h-full" style={{ width: `${h.composition.selfLearning}%` }} />
                                                                <div className="bg-purple-500 h-full" style={{ width: `${h.composition.competitorForging}%` }} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pagination Controls */}
                                        {aiState.history.length > historyPageSize && (
                                            <div className="flex items-center justify-between px-2 py-2 mt-2 border-t border-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400">Rows:</span>
                                                    <select
                                                        value={historyPageSize}
                                                        onChange={(e) => {
                                                            setHistoryPageSize(Number(e.target.value));
                                                            setHistoryPage(1);
                                                        }}
                                                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={15}>15</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <span>{((historyPage - 1) * historyPageSize) + 1}-{Math.min(historyPage * historyPageSize, aiState.history.length)} of {aiState.history.length}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                                        disabled={historyPage === 1}
                                                        className="p-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <ChevronLeft className="w-3.5 h-3.5" />
                                                    </button>
                                                    {Array.from({ length: Math.min(5, Math.ceil(aiState.history.length / historyPageSize)) }, (_, i) => i + 1).map(page => (
                                                        <button
                                                            key={page}
                                                            onClick={() => setHistoryPage(page)}
                                                            className={`w-7 h-7 text-xs rounded ${
                                                                historyPage === page 
                                                                    ? 'bg-blue-500 text-white' 
                                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                            }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    ))}
                                                    <button
                                                        onClick={() => setHistoryPage(p => Math.min(Math.ceil(aiState.history.length / historyPageSize), p + 1))}
                                                        disabled={historyPage >= Math.ceil(aiState.history.length / historyPageSize)}
                                                        className="p-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CollapsiblePanel>
                    <AIConfig />
                </div>
            </div>
        </div>
    );
};

const getLatencyTooltip = (key: string) => {
    switch (key) {
        case 'internalCacheLookup': return 'Time to retrieve data from in-memory cache.';
        case 'apiHotPath': return 'Total API response time for critical data endpoints.';
        case 'blockEventDetection': return 'Time from block creation to our system detecting it.';
        case 'executionPath': return 'Time to prepare and send a transaction bundle.';
        case 'externalDataFetch': return 'Time to fetch data from external APIs like DexScreener.';
        default: return '';
    }
};

export default AIOptimizer;