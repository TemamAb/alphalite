import React, { useState, useEffect } from 'react';
import { Wallet, ShieldCheck } from 'lucide-react';

export const ProfitControl: React.FC = () => {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/status').then(res => res.json()).then(setStatus);
    const interval = setInterval(() => {
        fetch('/api/status').then(res => res.json()).then(setStatus);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return <div>Loading...</div>;

  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-2xl text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Wallet className="text-purple-500" /> Treasury & Capital Control
        </h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-600">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          <span className="text-xs font-mono text-slate-300">TIER: {status.config.capital_velocity_tier.toUpperCase()}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs">Total Trades</div>
              <div className="text-xl font-mono text-white">{status.stats.totalTrades}</div>
          </div>
          <div className="bg-slate-800 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs">Total Profit (ETH)</div>
              <div className="text-xl font-mono text-green-400">{status.stats.totalProfit.toFixed(4)}</div>
          </div>
      </div>
    </div>
  );
};
