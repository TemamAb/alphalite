import { useEffect, useState } from 'react';
import { useDashboardStore } from '@/stores';
import DataTable from '@/components/DataTable';
import CollapsiblePanel from '@/components/CollapsiblePanel';
import Tooltip from '@/components/Tooltip';
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Zap,
  Clock,
  Wallet,
  Coins,
} from 'lucide-react';

interface HomeStats {
  profitPerTrade: number;
  tradesPerHour: number;
  profitPerHour: number;
  smartWalletBalance: number;
  latency: number;
  totalProfit: number;
  totalTrades: number;
  winRate: number;
}

const formatMs = (v: number) => `${v.toFixed(0)}ms`;
const formatEth = (v: number) => `${v.toFixed(4)} ETH`;
const formatUsd = (v: number) => `$${v.toFixed(2)}`;

const getFormatCurrency = (currency: 'USD' | 'ETH') => (v: number) => {
  return currency === 'ETH' ? formatEth(v) : formatUsd(v);
};

export default function Home() {
  const { stats, engineStatus, wallets, isLoading, fetchStats, fetchWalletBalances, currency } = useDashboardStore();

  const formatValue = getFormatCurrency(currency);

  const profitColumns = [
    { key: 'profitPerTrade', label: 'PROFIT/TRADE', tooltip: 'Average profit per executed trade.', format: (v: number) => formatValue(v) },
    { key: 'tradesPerHour', label: 'TRADES/HR', format: (v: number) => v.toFixed(1) },
    { key: 'profitPerHour', label: 'PROFIT/HR', format: (v: number) => formatValue(v) },
    { key: 'todayProfit', label: 'TODAY PROFIT', format: (v: number) => formatValue(v) },
    { key: 'capitalVelocity', label: 'CAPITAL VELOCITY', tooltip: 'Daily capital turnover rate.', format: (v: number) => `${v}x` },
    { key: 'gasFees', label: 'GAS FEES', tooltip: 'Total gas spent.', format: (v: number) => formatValue(v) },
  ];

  const capitalVelocityColumns = [
    { key: 'velocity', label: 'VELOCITY', tooltip: 'Capital turnover multiplier.', format: (v: number) => `${v.toFixed(2)}x` },
    { key: 'turnover', label: 'TURNOVER', format: (v: number) => formatValue(v) },
    { key: 'efficiency', label: 'EFFICIENCY', format: (v: number) => `${v.toFixed(1)}%` },
    { key: 'rotation', label: 'ROTATION', format: (v: number) => v.toFixed(1) },
  ];

  const latencyColumns = [
    { key: 'cacheLookup', label: 'CACHE', format: (v: number) => formatMs(v) },
    { key: 'apiHotPath', label: 'API', format: (v: number) => formatMs(v) },
    { key: 'blockDetection', label: 'BLOCK', format: (v: number) => formatMs(v) },
    { key: 'executionPath', label: 'EXEC', format: (v: number) => formatMs(v) },
    { key: 'externalFetch', label: 'EXTERNAL', format: (v: number) => formatMs(v) },
  ];

  const bribeColumns = [
    { key: 'bribeAmount', label: 'BRIBE', format: (v: number) => formatEth(v) },
    { key: 'successRate', label: 'SUCCESS %', format: (v: number) => `${v.toFixed(1)}%` },
    { key: 'roi', label: 'ROI %', format: (v: number) => `${v.toFixed(1)}%` },
    { key: 'totalPaid', label: 'TOTAL PAID', format: (v: number) => formatEth(v) },
  ];

  const [homeStats, setHomeStats] = useState<HomeStats>({
    profitPerTrade: 0,
    tradesPerHour: 0,
    profitPerHour: 0,
    smartWalletBalance: 0,
    latency: 0,
    totalProfit: 0,
    totalTrades: 0,
    winRate: 0,
  });

  const [profitData] = useState([]);
  const [latencyData] = useState([]);
  const [bribeData] = useState([]);
  const [capitalVelocityData] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchWalletBalances();

    const totalTrades = stats.totalRequests || 0;
    const totalProfit = engineStatus.totalProfit || 0;
    const profitPerTrade = totalTrades > 0 ? totalProfit / totalTrades : 0;
    const tradesPerHour = totalTrades / 24;
    const profitPerHour = tradesPerHour * profitPerTrade;
    const smartWalletBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance || '0'), 0);

    setHomeStats({
      profitPerTrade,
      tradesPerHour,
      profitPerHour,
      smartWalletBalance,
      latency: stats.avgLatency || 0,
      totalProfit,
      totalTrades,
      winRate: 65.5,
    });
  }, [stats, engineStatus, wallets, fetchStats, fetchWalletBalances]);

  const totalTodayProfit = (profitData[0] as any)?.todayProfit || 0;
  const avgLatency = latencyData[0] ?
    ((latencyData[0] as any).apiHotPath + (latencyData[0] as any).executionPath) / 2 : 0;
  const totalBribes = (bribeData[0] as any)?.totalPaid || 0;

  const handleRefresh = () => {
    fetchStats();
    fetchWalletBalances();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-mono">HOME</h2>
          <p className="text-xs text-slate-500 font-mono">Dashboard Overview</p>
        </div>
        <Tooltip content="Refresh all dashboard data from API endpoints">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 text-slate-300 text-xs font-mono rounded hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </Tooltip>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-emerald-400" />
            <div className="text-xs text-slate-400">TODAY PROFIT</div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{formatValue(totalTodayProfit)}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div className="text-xs text-slate-400">AVG LATENCY</div>
          </div>
          <div className="text-2xl font-bold text-cyan-400">{formatMs(avgLatency)}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <div className="text-xs text-slate-400">BRIBES TODAY</div>
          </div>
          <div className="text-2xl font-bold text-purple-400">{formatEth(totalBribes)}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-green-400" />
            <div className="text-xs text-slate-400">ENGINE</div>
          </div>
          <div className="text-2xl font-bold text-green-400">{engineStatus.isRunning ? 'RUNNING' : 'STOPPED'}</div>
        </div>
      </div>

      <CollapsiblePanel title="ENGINE STATUS" defaultExpanded={true}>
        <div className="p-3">
          <table className="w-full text-xs font-mono">
            <tbody>
              <tr className="border-b border-slate-700/30">
                <td className="py-2 text-slate-400 w-1/3">MODE</td>
                <td className="py-2">
                  <span className="px-2 py-0.5 rounded bg-green-900/50 text-green-400">
                    {engineStatus.mode.toUpperCase()}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-700/30">
                <td className="py-2 text-slate-400">STATUS</td>
                <td className="py-2 text-slate-200">{engineStatus.isRunning ? 'RUNNING' : 'STOPPED'}</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-400">TOTAL PROFIT ({currency})</td>
                <td className="py-2 text-green-400">{formatValue(homeStats.totalProfit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel title="PROFIT METRICS" defaultExpanded={false}>
        <div className="p-3">
          <DataTable data={profitData} columns={profitColumns} firstColumnLabel="DAY" showTotals={true} />
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel title="CAPITAL VELOCITY" defaultExpanded={false}>
        <div className="p-3">
          <DataTable data={capitalVelocityData} columns={capitalVelocityColumns} firstColumnLabel="DAY" showTotals={true} />
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel title="LATENCY METRICS" defaultExpanded={false}>
        <div className="p-3">
          <DataTable data={latencyData} columns={latencyColumns} firstColumnLabel="DAY" showTotals={true} />
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel title="BRIBE METRICS" defaultExpanded={false}>
        <div className="p-3">
          <DataTable data={bribeData} columns={bribeColumns} firstColumnLabel="DAY" showTotals={true} />
        </div>
      </CollapsiblePanel>
    </div>
  );
}
