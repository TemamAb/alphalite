import React from 'react';
import { useSystemStore, useDashboardStore } from '@/stores';

interface PersonaHUDProps {
    selectedPersona: string;
}

const PersonaHUD: React.FC<PersonaHUDProps> = ({ selectedPersona }) => {
    const { engineMetrics, tradeStats, systemHealth } = useSystemStore();
    const { stats } = useDashboardStore();

    const metrics = {
        profit: tradeStats?.totalProfit || stats.profitToday || 0,
        latency: systemHealth?.components.find(c => c.name === 'API Gateway')?.latency || 0,
        winRate: tradeStats?.winRate || 0,
        activeStrategies: engineMetrics?.activeStrategies || 0,
        riskScore: 0 // Pending real risk scoring implementation
    };

    switch (selectedPersona) {
        case 'sniper':
            return (
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-red-900/20 border border-red-500/30 p-2 rounded text-center">
                        <div className="text-xs text-red-400 uppercase">Latency</div>
                        <div className="text-lg font-mono font-bold text-white">{metrics.latency}ms</div>
                    </div>
                    <div className="bg-red-900/20 border border-red-500/30 p-2 rounded text-center">
                        <div className="text-xs text-red-400 uppercase">Mempool</div>
                        <div className="text-lg font-mono font-bold text-white">SCANNING</div>
                    </div>
                    <div className="bg-red-900/20 border border-red-500/30 p-2 rounded text-center">
                        <div className="text-xs text-red-400 uppercase">Targeting</div>
                        <div className="text-lg font-mono font-bold text-white">AGGRESSIVE</div>
                    </div>
                </div>
            );
        case 'sentinel':
            return (
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-green-900/20 border border-green-500/30 p-2 rounded text-center">
                        <div className="text-xs text-green-400 uppercase">Risk Score</div>
                        <div className="text-lg font-mono font-bold text-white">{metrics.riskScore}/100</div>
                    </div>
                    <div className="bg-green-900/20 border border-green-500/30 p-2 rounded text-center">
                        <div className="text-xs text-green-400 uppercase">Audit</div>
                        <div className="text-lg font-mono font-bold text-white">REAL-TIME</div>
                    </div>
                    <div className="bg-green-900/20 border border-green-500/30 p-2 rounded text-center">
                        <div className="text-xs text-green-400 uppercase">Shield</div>
                        <div className="text-lg font-mono font-bold text-white">ACTIVE</div>
                    </div>
                </div>
            );
        default: // Strategist/Auto/Optimizer/Architect/Engineer
            return (
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-blue-900/20 border border-blue-500/30 p-2 rounded text-center">
                        <div className="text-xs text-blue-400 uppercase">Profit (24h)</div>
                        <div className="text-lg font-mono font-bold text-white">{metrics.profit.toFixed(4)} Ξ</div>
                    </div>
                    <div className="bg-blue-900/20 border border-blue-500/30 p-2 rounded text-center">
                        <div className="text-xs text-blue-400 uppercase">Win Rate</div>
                        <div className="text-lg font-mono font-bold text-white">{metrics.winRate}%</div>
                    </div>
                    <div className="bg-blue-900/20 border border-blue-500/30 p-2 rounded text-center">
                        <div className="text-xs text-blue-400 uppercase">Active Strats</div>
                        <div className="text-lg font-mono font-bold text-white">{metrics.activeStrategies}</div>
                    </div>
                </div>
            );
    }
};

export default PersonaHUD;