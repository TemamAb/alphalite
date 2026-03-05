import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { Cpu, BarChart, GitBranch, GitCommit, Zap } from 'lucide-react';

interface Strategy {
    name: string;
    risk: string;
    profitMultiplier: number;
    activeTrades: number;
}

interface RankedItem {
    id?: string;
    name?: string;
    pair?: string;
    chain?: string;
    score: number;
    activeTrades: number;
}

const riskColorMap: { [key: string]: string } = {
    'Low': 'text-green-400',
    'Medium': 'text-yellow-400',
    'High': 'text-red-400',
};

const StrategiesPage: React.FC = () => {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [rankings, setRankings] = useState<{ topChains: RankedItem[], topDexes: RankedItem[], topPairs: RankedItem[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthStore.getState();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const fetchData = async () => {
        const headers = { 'Authorization': `Bearer ${token}` };
        try {
            const [strategiesRes, rankingsRes] = await Promise.all([
                fetch(`${API_URL}/api/strategies`, { headers }),
                fetch(`${API_URL}/api/rankings`, { headers }),
            ]);

            if (strategiesRes.ok && rankingsRes.ok) {
                const strategiesData = await strategiesRes.json();
                const rankingsData = await rankingsRes.json();

                setStrategies(strategiesData.sort((a: Strategy, b: Strategy) => b.activeTrades - a.activeTrades));
                setRankings(rankingsData);
            } else {
                console.error("Failed to fetch data", { strategiesRes, rankingsRes });
            }

        } catch (error) {
            console.error("Failed to fetch strategies data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000); // Refresh every 2 seconds
        return () => clearInterval(interval);
    }, []);

    const renderTable = (title: string, icon: React.ReactNode, items: any[], headers: string[], renderRow: (item: any, index: number) => React.ReactNode) => (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                {icon} {title}
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                        <tr>
                            {headers.map(h => <th key={h} className="p-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {items && items.length > 0 ? items.map(renderRow) : (
                            <tr>
                                <td colSpan={headers.length} className="p-4 text-center text-gray-500 italic">No data available.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (loading) {
        return <div className="p-6 text-center text-gray-500">Loading Strategy & Concurrency Data...</div>;
    }

    return (
        <div className="p-4 sm:p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Strategy & Concurrency</h1>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 border border-gray-600 rounded-lg">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-white">
                        {rankings?.topChains.reduce((acc, c) => acc + c.activeTrades, 0) || 0} Active Trades
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Strategies Panel */}
                {renderTable(
                    "Strategy Concurrency",
                    <Cpu className="w-5 h-5" />,
                    strategies,
                    ['Strategy', 'Risk', 'Multiplier', 'Active'],
                    (s: Strategy, i) => (
                        <tr key={i} className="border-b border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{s.name}</td>
                            <td className={`p-3 font-semibold ${riskColorMap[s.risk]}`}>{s.risk}</td>
                            <td className="p-3 font-mono text-right text-gray-400">{s.profitMultiplier}x</td>
                            <td className="p-3 font-bold text-right text-blue-400">{s.activeTrades}</td>
                        </tr>
                    )
                )}

                {/* Chains Panel */}
                {renderTable(
                    "Chain Concurrency",
                    <GitBranch className="w-5 h-5" />,
                    rankings?.topChains || [],
                    ['Chain', 'Score', 'Active'],
                    (c: RankedItem, i) => (
                        <tr key={i} className="border-b border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="p-3 font-medium text-gray-800 dark:text-gray-200 capitalize">{c.id}</td>
                            <td className="p-3 font-mono text-right text-gray-400">{c.score.toFixed(2)}</td>
                            <td className="p-3 font-bold text-right text-blue-400">{c.activeTrades}</td>
                        </tr>
                    )
                )}

                {/* DEXs Panel */}
                {renderTable(
                    "DEX Concurrency",
                    <BarChart className="w-5 h-5" />,
                    rankings?.topDexes || [],
                    ['DEX', 'Chain', 'Score', 'Active'],
                    (d: RankedItem, i) => (
                        <tr key={i} className="border-b border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{d.id}</td>
                            <td className="p-3 text-gray-500 dark:text-gray-400 capitalize">{d.chain}</td>
                            <td className="p-3 font-mono text-right text-gray-400">{d.score.toFixed(2)}</td>
                            <td className="p-3 font-bold text-right text-blue-400">{d.activeTrades}</td>
                        </tr>
                    )
                )}

                {/* Pairs Panel */}
                {renderTable(
                    "Pair Concurrency",
                    <GitCommit className="w-5 h-5" />,
                    rankings?.topPairs || [],
                    ['Pair', 'Score', 'Active'],
                    (p: RankedItem, i) => (
                        <tr key={i} className="border-b border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="p-3 font-mono text-xs text-gray-800 dark:text-gray-200" title={p.pair}>{p.pair?.substring(0, 25)}...</td>
                            <td className="p-3 font-mono text-right text-gray-400">{p.score.toFixed(2)}</td>
                            <td className="p-3 font-bold text-right text-blue-400">{p.activeTrades}</td>
                        </tr>
                    )
                )}
            </div>
        </div>
    );
};

export default StrategiesPage;