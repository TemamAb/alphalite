import React, { useEffect, useState } from 'react';
import { Activity, Trophy } from 'lucide-react';

export const BenchmarkDashboard: React.FC = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const res = await fetch('/api/benchmark');
            const json = await res.json();
            setData(json);
        } catch(e) { console.error(e); }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-2xl text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="text-blue-500" /> Competitive Landscape
        </h2>
        <span className="text-xs font-mono text-green-400 animate-pulse">LIVE</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700 text-sm uppercase">
              <th className="p-3">Rank</th>
              <th className="p-3">Application</th>
              <th className="p-3">Profit/Trade (ETH)</th>
              <th className="p-3">Velocity ($M)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.name} className={`border-b border-slate-800 ${row.isAlphaPro ? 'bg-blue-900/20 border-l-4 border-l-blue-500' : ''}`}>
                <td className="p-3 font-mono">{row.rank === 1 ? <Trophy className="w-4 h-4 text-yellow-400" /> : `#${row.rank}`}</td>
                <td className="p-3 font-bold">{row.name}</td>
                <td className="p-3 font-mono text-green-400">{row.ppt.toFixed(2)}</td>
                <td className="p-3 font-mono">{row.velocity}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
