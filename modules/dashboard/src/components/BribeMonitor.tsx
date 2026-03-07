import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { Banknote, Save, SlidersHorizontal, Trash2, Activity } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';

interface BribeCorrelation {
    range: string;
    successRate: number;
    totalTrades: number;
}

interface RecentBribe {
    id: string;
    timestamp: string;
    bribe: string;
    profit: string;
    success: boolean;
    strategy: string;
}

interface BribeMetrics {
    correlationData: BribeCorrelation[];
    recentBribes: RecentBribe[];
    totalBribesPaid: string;
    avgRoi: number;
}

interface Strategy {
    name: string;
    risk: 'Low' | 'Medium' | 'High';
}

interface BribeSettings {
    defaultBribeShares: { [key: string]: number };
    strategyOverrides: { [key: string]: number };
}

const BribeMonitor: React.FC = () => {
    const [metrics, setMetrics] = useState<BribeMetrics | null>(null);
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [bribeSettings, setBribeSettings] = useState<BribeSettings | null>(null);
    const [tempOverrides, setTempOverrides] = useState<{ [key: string]: number }>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { token } = useAuthStore.getState();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const fetchMetrics = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            const [metricsRes, strategiesRes, bribeSettingsRes] = await Promise.all([
                fetch(`${API_URL}/api/metrics/bribes`, { headers }),
                fetch(`${API_URL}/api/strategies`, { headers }),
                fetch(`${API_URL}/api/settings/bribes`, { headers }),
            ]);

            if (metricsRes.ok && strategiesRes.ok && bribeSettingsRes.ok) {
                setMetrics(await metricsRes.json());
                setStrategies(await strategiesRes.json());
                const settingsData = await bribeSettingsRes.json();
                setBribeSettings(settingsData);
                // Initialize temp state with current overrides
                setTempOverrides(settingsData.strategyOverrides || {});
            }
        } catch (error) {
            console.error("Failed to fetch bribe metrics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 10000); // Refresh less often
        return () => clearInterval(interval);
    }, []);

    const handleOverrideChange = (strategyName: string, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            setTempOverrides(prev => ({ ...prev, [strategyName]: numValue }));
        }
    };

    const handleClearOverride = (strategyName: string) => {
        const newOverrides = { ...tempOverrides };
        delete newOverrides[strategyName];
        setTempOverrides(newOverrides);
    };

    const handleSaveBribeSettings = async () => {
        setSaving(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            const res = await fetch(`${API_URL}/api/settings/bribes`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ strategyOverrides: tempOverrides })
            });
            if (res.ok) {
                await fetchMetrics(); // Refresh data to confirm changes
            } else {
                console.error("Failed to save bribe settings");
            }
        } catch (error) {
            console.error("Error saving bribe settings:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6 text-gray-500">Loading Bribe Analytics...</div>;
    if (!metrics || !bribeSettings) return <div className="p-6 text-red-500">Failed to load data.</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Banknote className="w-8 h-8 text-green-500" />
                        Bribe Monitor
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Miner Extraction Value (MEV) Bidding Analytics</p>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-green-900/20 border border-green-800 rounded-lg">
                        <div className="text-xs text-green-400 uppercase font-bold">Total Bribes</div>
                        <div className="text-xl font-mono text-green-300">{metrics.totalBribesPaid} ETH</div>
                    </div>
                    <div className="px-4 py-2 bg-blue-900/20 border border-blue-800 rounded-lg">
                        <div className="text-xs text-blue-400 uppercase font-bold">Avg Bribe ROI</div>
                        <div className="text-xl font-mono text-blue-300">{metrics.avgRoi}%</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Correlation Chart */}
                <div className="lg:col-span-2">
                    <CollapsiblePanel title="Bribe Efficiency Correlation" defaultExpanded={true}>
                        <div className="p-6">
                            <p className="text-sm text-gray-500 mb-4">Success Rate vs. Bribe Amount (ETH)</p>
                            <div className="space-y-4">
                                {metrics.correlationData.map((item, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-xs font-mono text-gray-400">
                                            <span>{item.range}</span>
                                            <span>{item.successRate}% Success ({item.totalTrades} trades)</span>
                                        </div>
                                        <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
                                            <div 
                                                className={`h-full transition-all duration-500 ${
                                                    item.successRate > 80 ? 'bg-green-500' : 
                                                    item.successRate > 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${item.successRate}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 p-3 bg-blue-900/10 border border-blue-800/30 rounded text-xs text-blue-300 flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Insight: Bribes &gt; 0.1 ETH show a 95%+ inclusion rate in the next block.
                            </div>
                        </div>
                    </CollapsiblePanel>
                </div>

                {/* Recent Bribes List */}
                <div className="lg:col-span-1">
                    <CollapsiblePanel title="Recent Bribe Activity" defaultExpanded={true}>
                        <div className="p-0">
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                        <tr>
                                            <th className="p-3 font-semibold text-gray-500">Info</th>
                                            <th className="p-3 font-semibold text-gray-500 text-right">Bribe</th>
                                            <th className="p-3 font-semibold text-gray-500 text-right">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {metrics.recentBribes.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="p-3">
                                                    <div className="font-medium text-gray-800 dark:text-gray-200">{tx.strategy}</div>
                                                    <div className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="p-3 text-right font-mono text-yellow-500">
                                                    {tx.bribe} Ξ
                                                </td>
                                                <td className="p-3 text-right">
                                                    {tx.success ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                            +{tx.profit}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                            Missed
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </CollapsiblePanel>
                </div>
            </div>

            {/* Bribe Settings Panel */}
            <CollapsiblePanel title="Strategy Bribe Overrides" icon={<SlidersHorizontal className="w-5 h-5" />}>
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {strategies.map(strategy => {
                            const overrideValue = tempOverrides[strategy.name];
                            const defaultValue = bribeSettings.defaultBribeShares[strategy.risk];
                            const isOverridden = overrideValue !== undefined;
                            const displayValue = isOverridden ? overrideValue : defaultValue;

                            return (
                                <div key={strategy.name} className={`p-4 rounded-lg border ${isOverridden ? 'bg-blue-900/20 border-blue-700' : 'bg-gray-800/50 border-gray-700'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-white">{strategy.name}</span>
                                        {isOverridden && (
                                            <button onClick={() => handleClearOverride(strategy.name)} className="text-gray-400 hover:text-red-400" title="Remove override">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mb-3">Default ({strategy.risk}): {defaultValue}%</p>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={displayValue}
                                            onChange={(e) => handleOverrideChange(strategy.name, e.target.value)}
                                            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-600 accent-blue-500"
                                        />
                                        <span className="font-mono text-lg text-white w-12 text-right">{displayValue}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button onClick={handleSaveBribeSettings} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait">
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Bribe Settings'}
                        </button>
                    </div>
                </div>
            </CollapsiblePanel>
        </div>
    );
};

export default BribeMonitor;