import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { Droplets, Layers, TrendingUp } from 'lucide-react';

interface LiquiditySource {
    name: string;
    maxCapacity: number;
    available: number;
    reliability: number;
    fee: number;
}

interface LiquidityData {
    total: number;
    sources: LiquiditySource[];
    token: string;
}

const LiquidityMonitor: React.FC = () => {
    const [data, setData] = useState<LiquidityData | null>(null);
    const { token } = useAuthStore.getState();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const fetchData = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const res = await fetch(`${API_URL}/api/metrics/liquidity`, { headers });
            if (res.ok) setData(await res.json());
        } catch (e) {
            console.error("Liquidity fetch failed", e);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!data) return <div className="p-4 text-gray-500 text-xs">Loading Liquidity...</div>;

    const formatMoney = (num: number) => {
        return (num / 1000000).toFixed(1) + 'M';
    };

    return (
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-cyan-400" /> Leviathan Pools
                </h3>
                <span className="text-xs font-mono text-cyan-300 bg-cyan-900/30 px-2 py-1 rounded">
                    ${formatMoney(data.total)} Available
                </span>
            </div>

            <div className="space-y-3">
                {data.sources.map((source) => (
                    <div key={source.name} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>{source.name}</span>
                            <span>${formatMoney(source.available)}</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                                style={{ width: `${(source.available / source.maxCapacity) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-700 flex items-center gap-2 text-[10px] text-slate-500">
                <Layers className="w-3 h-3" />
                <span>Aggregated across 5 protocols for max velocity</span>
            </div>
        </div>
    );
};

export default LiquidityMonitor;