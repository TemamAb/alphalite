import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { Gauge, Zap, Activity } from 'lucide-react';

interface VolatilityMetrics {
    index: number;
    turboMode: boolean;
    trend: 'rising' | 'falling' | 'stable';
}

const VolatilityGauge: React.FC = () => {
    const [metrics, setMetrics] = useState<VolatilityMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthStore.getState();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const fetchMetrics = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const res = await fetch(`${API_URL}/api/metrics/volatility`, { headers });
            if (res.ok) {
                setMetrics(await res.json());
            }
        } catch (error) {
            console.error("Failed to fetch volatility metrics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 2000); // Fast refresh for volatility
        return () => clearInterval(interval);
    }, []);

    if (loading || !metrics) return <div className="p-4 text-gray-500 text-xs">Loading Volatility...</div>;

    // Calculate gauge rotation (0 to 180 degrees)
    const rotation = (metrics.index / 100) * 180;
    
    // Determine color based on index
    const getColor = (val: number) => {
        if (val < 30) return 'text-blue-400';
        if (val < 70) return 'text-yellow-400';
        return 'text-red-500';
    };

    const colorClass = getColor(metrics.index);

    return (
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Market Volatility
                </h3>
                {metrics.turboMode && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold uppercase rounded flex items-center gap-1 animate-pulse">
                        <Zap className="w-3 h-3" /> Turbo
                    </span>
                )}
            </div>

            <div className="relative h-24 flex items-end justify-center overflow-hidden">
                {/* Gauge Background */}
                <div className="absolute w-32 h-16 border-[12px] border-slate-700 rounded-t-full top-4"></div>
                
                {/* Gauge Value Arc (Simplified via rotation or SVG could be used for precision) */}
                {/* For simplicity in this component, we use a needle */}
                <div 
                    className="absolute w-1 h-16 bg-white origin-bottom bottom-0 transition-all duration-500 ease-out"
                    style={{ transform: `rotate(${rotation - 90}deg)` }}
                ></div>
                
                {/* Center Point */}
                <div className="absolute w-4 h-4 bg-slate-200 rounded-full bottom-[-2px]"></div>
            </div>

            <div className={`text-center text-2xl font-bold mt-2 ${colorClass}`}>
                {metrics.index.toFixed(0)} <span className="text-xs text-slate-500 font-normal">MVI</span>
            </div>
        </div>
    );
};

export default VolatilityGauge;