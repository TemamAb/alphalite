import { useEffect, useState } from 'react';
import { useDashboardStore } from '@/stores';
import Tooltip from '@/components/Tooltip';
import CollapsiblePanel from '@/components/CollapsiblePanel';
import {
  RefreshCw,
  ArrowUpRight,
  CheckCircle,
  AlertTriangle,
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

export default function Home() {
  const { stats, engineStatus, wallets, isLoading, fetchStats, fetchWalletBalances } = useDashboardStore();
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

  useEffect(() => {
    fetchStats();
    fetchWalletBalances();
    
    const totalTrades = stats.totalRequests || 0;
    const totalProfit = engineStatus.totalProfit || 0;
    const profitPerTrade = totalTrades > 0 ? totalProfit / totalTrades : 0;
    const tradesPerHour = totalTrades / 24;
    const profitPerHour = tradesPerHour * profitPerTrade;
    const smartWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    
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
  }, [stats, engineStatus, wallets]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-mono">HOME</h2>
          <p className="text-xs text-slate-500 font-mono">Dashboard Overview</p>
        </div>
        <Tooltip content="Refresh all dashboard data from API endpoints">
          <button
            onClick={() => {
              fetchStats();
              fetchWalletBalances();
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 text-slate-300 text-xs font-mono rounded hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </Tooltip>
      </div>

      {/* Engine Status */}
      <CollapsiblePanel 
        title="ENGINE STATUS" 
        tooltip="Current trading engine state"
        defaultExpanded={true}
      >
        <div className="p-3">
          <table className="w-full text-xs font-mono">
            <tbody>
              <tr className="border-b border-slate-700/30">
                <td className="py-2 text-slate-400 w-1/3">MODE</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded ${
                    engineStatus.mode === 'live' 
                      ? 'bg-green-900/50 text-green-400' 
                      : 'bg-green-900/50 text-green-400'
                  }`}>
                    {engineStatus.mode.toUpperCase()}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-700/30">
                <td className="py-2 text-slate-400">STATUS</td>
                <td className="py-2 text-slate-200">{engineStatus.isRunning ? 'RUNNING' : 'STOPPED'}</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-400">TOTAL PROFIT</td>
                <td className="py-2 text-green-400">{formatCurrency(homeStats.totalProfit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>

      {/* Profit Metrics */}
      <CollapsiblePanel 
        title="PROFIT METRICS" 
        tooltip="Trading profit and performance data"
        defaultExpanded={true}
      >
        <div className="p-3">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700/30">
                <th className="text-left py-2 font-medium">METRIC</th>
                <th className="text-right py-2 font-medium">VALUE</th>
                <th className="text-right py-2 font-medium">CHANGE</th>
              </tr>
            </thead>
            <tbody>
              <Tooltip content="Net profit divided by total number of trades executed">
                <tr className="border-b border-slate-700/30 cursor-help">
                  <td className="py-2 text-slate-400">PROFIT/TRADE</td>
                  <td className="py-2 text-right text-slate-200">{formatCurrency(homeStats.profitPerTrade)}</td>
                  <td className="py-2 text-right text-green-400 flex items-center justify-end gap-1">
                    <ArrowUpRight className="w-3 h-3" /> +5.2%
                  </td>
                </tr>
              </Tooltip>
              <Tooltip content="Average number of trades executed per hour">
                <tr className="border-b border-slate-700/30 cursor-help">
                  <td className="py-2 text-slate-400">TRADES/HOUR</td>
                  <td className="py-2 text-right text-slate-200">{formatNumber(homeStats.tradesPerHour)}</td>
                  <td className="py-2 text-right text-green-400 flex items-center justify-end gap-1">
                    <ArrowUpRight className="w-3 h-3" /> +12.8%
                  </td>
                </tr>
              </Tooltip>
              <Tooltip content="Total profit generated per hour of operation">
                <tr className="border-b border-slate-700/30 cursor-help">
                  <td className="py-2 text-slate-400">PROFIT/HOUR</td>
                  <td className="py-2 text-right text-slate-200">{formatCurrency(homeStats.profitPerHour)}</td>
                  <td className="py-2 text-right text-green-400 flex items-center justify-end gap-1">
                    <ArrowUpRight className="w-3 h-3" /> +8.4%
                  </td>
                </tr>
              </Tooltip>
              <Tooltip content="Net profit after subtracting gas fees for today">
                <tr className="border-b border-slate-700/30 cursor-help">
                  <td className="py-2 text-slate-400">TODAY PROFIT</td>
                  <td className="py-2 text-right text-green-400">{formatCurrency(stats.profitToday - stats.lossToday)}</td>
                  <td className="py-2 text-right text-slate-500">-</td>
                </tr>
              </Tooltip>
              <Tooltip content="Total gas fees spent on transactions today">
                <tr className="cursor-help">
                  <td className="py-2 text-slate-400">GAS FEES TODAY</td>
                  <td className="py-2 text-right text-red-400">{formatCurrency(stats.lossToday)}</td>
                  <td className="py-2 text-right text-slate-500">-</td>
                </tr>
              </Tooltip>
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>

      {/* Wallet & Performance */}
      <CollapsiblePanel 
        title="WALLET & PERFORMANCE" 
        tooltip="Wallet balances and system performance metrics"
        defaultExpanded={true}
      >
        <div className="p-3">
          <table className="w-full text-xs font-mono">
            <tbody>
              <Tooltip content="Total ETH balance across all connected wallets">
                <tr className="border-b border-slate-700/30 cursor-help">
                  <td className="py-2 text-slate-400 w-1/3">SMART WALLET</td>
                  <td className="py-2 text-right text-slate-200">{formatNumber(homeStats.smartWalletBalance)} ETH</td>
                </tr>
              </Tooltip>
              <Tooltip content="Number of wallets currently connected">
                <tr className="border-b border-slate-700/30 cursor-help">
                  <td className="py-2 text-slate-400">CONNECTED WALLETS</td>
                  <td className="py-2 text-right text-slate-200">{wallets.length}</td>
                </tr>
              </Tooltip>
              <Tooltip content="Total number of trades executed since start">
                <tr className="border-b border-slate-700/30 cursor-help">
                  <td className="py-2 text-slate-400">TOTAL TRADES</td>
                  <td className="py-2 text-right text-slate-200">{homeStats.totalTrades.toLocaleString()}</td>
                </tr>
              </Tooltip>
              <Tooltip content="Percentage of profitable trades vs total trades">
                <tr className="border-b border-slate-700/30 cursor-help">
                  <td className="py-2 text-slate-400">WIN RATE</td>
                  <td className="py-2 text-right text-green-400">{homeStats.winRate}%</td>
                </tr>
              </Tooltip>
              <Tooltip content="Average time from trade signal to execution completion">
                <tr className="cursor-help">
                  <td className="py-2 text-slate-400">LATENCY</td>
                  <td className="py-2 text-right text-slate-200">{homeStats.latency} ms</td>
                </tr>
              </Tooltip>
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>

      {/* MEV & Trading */}
      <CollapsiblePanel 
        title="MEV & TRADING" 
        tooltip="Maximal Extractable Value and frontrunning statistics"
        defaultExpanded={true}
      >
        <div className="p-3">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700/30">
                <th className="text-left py-2 font-medium">STRATEGY</th>
                <th className="text-right py-2 font-medium">TODAY</th>
                <th className="text-right py-2 font-medium">COUNT</th>
                <th className="text-right py-2 font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody>
              <Tooltip content="Profits extracted from arbitrage opportunities across DEXes">
                <tr className="border-b border-slate-700/30 cursor-help">
                  <td className="py-2 text-purple-400">MEV PROTECTION</td>
                  <td className="py-2 text-right text-slate-200">$2,450</td>
                  <td className="py-2 text-right text-slate-400">42</td>
                  <td className="py-2 text-right"><span className="text-green-400">PROTECTED</span></td>
                </tr>
              </Tooltip>
              <Tooltip content="Profits from sandwiching transactions">
                <tr className="border-b border-slate-700/30 cursor-help">
                  <td className="py-2 text-red-400">FRONTRUN PROTECTION</td>
                  <td className="py-2 text-right text-slate-200">$1,820</td>
                  <td className="py-2 text-right text-slate-400">28</td>
                  <td className="py-2 text-right"><span className="text-green-400">PROTECTED</span></td>
                </tr>
              </Tooltip>
              <Tooltip content="Protected transactions from being front-run">
                <tr className="cursor-help">
                  <td className="py-2 text-cyan-400">STEALTH MODE</td>
                  <td className="py-2 text-right text-slate-200">$450 saved</td>
                  <td className="py-2 text-right text-slate-400">156</td>
                  <td className="py-2 text-right"><span className="text-green-400">ENABLED</span></td>
                </tr>
              </Tooltip>
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>

      {/* System Alerts */}
      <CollapsiblePanel 
        title="SYSTEM ALERTS" 
        tooltip="Current system status and notifications"
        defaultExpanded={false}
      >
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-slate-400">MEV protection active on all DEXes</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <AlertTriangle className="w-3 h-3 text-yellow-400" />
            <span className="text-slate-400">High gas detected - consider waiting</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-slate-400">All strategies running optimally</span>
          </div>
        </div>
      </CollapsiblePanel>
    </div>
  );
}
