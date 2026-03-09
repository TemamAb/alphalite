import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/stores';
import { Zap, TrendingUp } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';

interface Trade {
    timestamp: string;
    strategy?: { name: string };
    netProfit?: number;
}

const FlashLoanStats: React.FC = () => {
    const [history, setHistory] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthStore.getState();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const headers = { 'Authorization': `Bearer ${token}` };
                const res = await fetch(`${API_URL}/api/history?limit=1000`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setHistory(data.trades || []);
                }
            } catch (error) {
                console.error("Failed to fetch flash loan stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token, API_URL]);

    const stats = useMemo(() => {
        const volumeByDay: Record<string, number> = {};
        let totalVolume = 0;

        history.forEach(t => {
            const date = new Date(t.timestamp).toLocaleDateString();
            const stratName = t.strategy?.name || '';
            const profit = t.netProfit || 0;
            
            // Get actual Flash Loan volume from trade data - cast to any to access dynamic properties
            const trade = t as any;
            const volume = trade.flashLoanAmount || trade.amount || trade.volume || trade.value || 0;

            volumeByDay[date] = (volumeByDay[date] || 0) + volume;
            totalVolume += volume;
        });

        // Convert to array and sort by date
        const trend = Object.entries(volumeByDay).map(([date, volume]) => ({
            date,
            volume
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Take last 14 days for the trend
        const recentTrend = trend.slice(-14);
        const maxVolume = Math.max(...recentTrend.map(d => d.volume), 1);

        return { totalVolume, recentTrend, maxVolume };
    }, [history]);

    if (loading) return <div className="p-4 text-gray-500 text-xs">Loading Flash Loan Stats...</div>;

    return (
        <CollapsiblePanel title="Flash Loan Volume Trend" icon={<Zap className="w-5 h-5 text-yellow-400" />} defaultExpanded={true}>
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-xs text-slate-400 uppercase">Total Volume</div>
                        <div className="text-xl font-bold text-yellow-400">{stats.totalVolume.toFixed(2)} ETH</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-400 uppercase">14-Day Trend</div>
                        <div className="flex items-center gap-1 text-green-400 text-sm font-bold">
                            <TrendingUp className="w-3 h-3" />
                            Active
                        </div>
                    </div>
                </div>

                {/* Bar Chart */}
                <div className="flex items-end gap-2 h-32 mt-4">
                    {stats.recentTrend.length > 0 ? stats.recentTrend.map((day) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div className="w-full relative flex items-end h-full bg-slate-800/50 rounded-t-sm overflow-hidden">
                                <div 
                                    className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 transition-all duration-500 hover:opacity-80"
                                    style={{ height: `${(day.volume / stats.maxVolume) * 100}%` }}
                                ></div>
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                                <div className="bg-slate-900 border border-slate-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap shadow-lg">
                                    <div className="font-bold">{day.date}</div>
                                    <div className="text-yellow-400">{day.volume.toFixed(2)} ETH</div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                            No recent flash loan activity
                        </div>
                    )}
                </div>
                {stats.recentTrend.length > 0 && (
                    <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                        <span>{stats.recentTrend[0]?.date}</span>
                        <span>{stats.recentTrend[stats.recentTrend.length - 1]?.date}</span>
                    </div>
                )}
            </div>
        </CollapsiblePanel>
    );
};

export default FlashLoanStats;