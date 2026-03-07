import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import CollapsiblePanel from './CollapsiblePanel';
import Tooltip from './Tooltip';
import { Info } from 'lucide-react';

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
    }[];
}

// --- Main Component ---
const AIOptimizer: React.FC = () => {
    const [latency, setLatency] = useState<LatencyMetrics | null>(null);
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [aiState, setAiState] = useState<AIOptimizerState | null>(null);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthStore.getState();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const fetchData = async () => {
        const headers = { 'Authorization': `Bearer ${token}` };
        try {
            const [latencyRes, benchmarkRes, aiRes] = await Promise.all([
                fetch(`${API_URL}/api/metrics/latency`, { headers }),
                fetch(`${API_URL}/api/benchmark`, { headers }),
                fetch(`${API_URL}/api/ai/optimizer`, { headers }),
            ]);

            setLatency(await latencyRes.json());
            setCompetitors((await benchmarkRes.json()).sort((a: Competitor, b: Competitor) => a.rank - b.rank));
            setAiState(await aiRes.json());

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

    if (loading) {
        return <div className="p-6 text-gray-500">Loading AI & Performance Data...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">AI Optimization & Performance</h1>

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
                </div>

                {/* Column 2: AI Optimizer State */}
                <div className="lg:col-span-1">
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
                                            {aiState.history.slice().reverse().map(h => (
                                                <div key={h.generation} className="flex justify-between items-center text-xs p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                                                    <div className="font-bold text-gray-500">Gen {h.generation}</div>
                                                    <div className="flex items-center">
                                                        <span className="mr-2 text-gray-400">Fitness:</span>
                                                        <span className="font-mono text-green-500">{h.fitness.toFixed(4)}</span>
                                                    </div>
                                                    <div className={`px-2 py-0.5 rounded-full text-white text-xs ${h.source === 'Self-Learning' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                                                        {h.source.split('-')[0]}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CollapsiblePanel>
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