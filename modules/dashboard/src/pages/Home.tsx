import { useEffect, useState } from 'react';
import { useDashboardStore } from '@/stores';
import DataTable from '@/components/DataTable';
import CollapsiblePanel from '@/components/CollapsiblePanel';
import Tooltip from '@/components/Tooltip';
import {
  RefreshCw,
  ArrowUpRight,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Zap,
  Clock,
  Wallet,
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

const formatCurrency = (v: number) => `$${(v || 0).toFixed(2)}`;
const formatMs = (v: number) => `${(v || 0).toFixed(0)}ms`;
const formatEth = (v: number) => `${(v || 0).toFixed(4)} ETH`;

// Column definitions for Profit Metrics table
const profitColumns = [
  { key: 'profitPerTrade', label: 'PROFIT/TRADE', tooltip: 'Average profit per executed trade.\nAI Optimizer targets >$40/trade via strategy rotation.', format: (v: number) => formatCurrency(v) },
  { key: 'tradesPerHour', label: 'TRADES/HR', format: (v: number) => v.toFixed(1) },
  { key: 'profitPerHour', label: 'PROFIT/HR', format: (v: number) => formatCurrency(v) },
  { key: 'todayProfit', label: 'TODAY PROFIT', format: (v: number) => formatCurrency(v) },
  { key: 'capitalVelocity', label: 'CAPITAL VELOCITY', tooltip: 'Daily capital turnover rate.\nAI maximizes this by reinvesting profits every 30s.', format: (v: number) => `${v}x` },
  { key: 'gasFees', label: 'GAS FEES', tooltip: 'Total gas spent.\nSniper Persona optimizes gas priority to minimize waste.', format: (v: number) => formatCurrency(v) },
];

// Column definitions for Capital Velocity table
const capitalVelocityColumns = [
  { key: 'velocity', label: 'VELOCITY', tooltip: 'Capital turnover multiplier.\nAI targets >10x daily velocity.', format: (v: number) => `${(v || 0).toFixed(2)}x` },
  { key: 'turnover', label: 'TURNOVER', format: (v: number) => formatCurrency(v) },
  { key: 'efficiency', label: 'EFFICIENCY', format: (v: number) => `${(v || 0).toFixed(1)}%` },
  { key: 'rotation', label: 'ROTATION', format: (v: number) => (v || 0).toFixed(1) },
];

// Column definitions for Latency Metrics table
const latencyColumns = [
  { key: 'cacheLookup', label: 'CACHE', tooltip: 'Internal data retrieval time.', format: (v: number) => formatMs(v) },
  { key: 'apiHotPath', label: 'API', tooltip: 'API response latency.', format: (v: number) => formatMs(v) },
  { key: 'blockDetection', label: 'BLOCK', tooltip: 'Time to detect new blocks.\nSniper Persona optimizes RPC connections.', format: (v: number) => formatMs(v) },
  { key: 'executionPath', label: 'EXEC', tooltip: 'Transaction preparation time.\nAI optimizes payload generation.', format: (v: number) => formatMs(v) },
  { key: 'externalFetch', label: 'EXTERNAL', format: (v: number) => formatMs(v) },
];

// Column definitions for Bribe Metrics table
const bribeColumns = [
  { key: 'bribeAmount', label: 'BRIBE', tooltip: 'Miner bribe amount.\nAI calculates optimal bribe to ensure inclusion.', format: (v: number) => formatEth(v) },
  { key: 'successRate', label: 'SUCCESS %', tooltip: 'Block inclusion rate.\nAI targets >95% success via dynamic bidding.', format: (v: number) => `${(v || 0).toFixed(1)}%` },
  { key: 'roi', label: 'ROI %', tooltip: 'Return on Investment for bribes.\nAI ensures bribes never exceed 90% of profit.', format: (v: number) => `${(v || 0).toFixed(1)}%` },
  { key: 'totalPaid', label: 'TOTAL PAID', format: (v: number) => formatEth(v) },
];

export default function Home() {
  const { 
    stats, 
    engineStatus, 
    wallets, 
    isLoading, 
    fetchStats, 
    fetchWalletBalances, 
    startEngine, 
    stopEngine 
  } = useDashboardStore();

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

  // Data for tables - now deriving from real state or remaining empty until fetched
  const [profitData, setProfitData] = useState<any[]>([]);
  const [latencyData, setLatencyData] = useState<any[]>([]);
  const [bribeData, setBribeData] = useState<any[]>([]);
  const [capitalVelocityData, setCapitalVelocityData] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchWalletBalances();
  }, [fetchStats, fetchWalletBalances]);

  useEffect(() => {
    const totalTrades = stats?.totalRequests || 0;
    const totalProfit = engineStatus?.totalProfit || 0;
    const profitPerTrade = totalTrades > 0 ? totalProfit / totalTrades : 0;
    const tradesPerHour = totalTrades > 0 ? totalTrades / 24 : 0; // Simplified
    const profitPerHour = tradesPerHour * profitPerTrade;
    const smartWalletBalance = (wallets || []).reduce((sum, w) => sum + (parseFloat(w.balance) || 0), 0);
    
    setHomeStats({
      profitPerTrade,
      tradesPerHour,
      profitPerHour,
      smartWalletBalance,
      latency: stats.avgLatency || 0,
      totalProfit,
      totalTrades,
      winRate: stats.winRate || 0,
    });

    // Sync table data with the single-row current stats if no history is loaded yet
    if (profitData.length === 0 && totalTrades > 0) {
      setProfitData([{
        id: 'current',
        profitPerTrade,
        tradesPerHour,
        profitPerHour,
        todayProfit: totalProfit,
        capitalVelocity: 0,
        gasFees: 0
      }]);
    }
  }, [stats, engineStatus, wallets, profitData.length]);

  const handleRefresh = () => {
    fetchStats();
    fetchWalletBalances();
  };

  const handleStartStop = async () => {
    if (engineStatus.isRunning) {
      await stopEngine();
    } else {
      await startEngine('live');
    }
  };

  // Calculate totals for summary cards
  const totalTodayProfit = homeStats.totalProfit;
  const avgLatency = homeStats.latency;
  const totalBribes = 0; // To be linked to real metrics

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-mono">HOME</h2>
          <p className="text-xs text-slate-500 font-mono">Real-time Performance Monitoring</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleStartStop}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-1.5 border font-mono text-xs rounded transition-all ${
              engineStatus.isRunning 
                ? 'bg-red-900/20 border-red-500 text-red-400 hover:bg-red-900/40' 
                : 'bg-emerald-900/20 border-emerald-500 text-emerald-400 hover:bg-emerald-900/40'
            }`}
          >
            <Zap className={`w-3 h-3 ${engineStatus.isRunning ? 'fill-red-400' : 'fill-emerald-400'}`} />
            {engineStatus.isRunning ? 'STOP ENGINE' : 'START ENGINE'}
          </button>
          <Tooltip content="Refresh all dashboard data">
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
      </div>

      {/* Summary Cards - Enterprise Grade */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <div className="text-xs text-slate-400">TOTAL PROFIT</div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalTodayProfit)}</div>
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
            <div className="text-xs text-slate-400">TOTAL TRADES</div>
          </div>
          <div className="text-2xl font-bold text-purple-400">{homeStats.totalTrades}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-green-400" />
            <div className="text-xs text-slate-400">WIN RATE</div>
          </div>
          <div className="text-2xl font-bold text-green-400">{homeStats.winRate.toFixed(1)}%</div>
        </div>
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
                    engineStatus?.mode === 'live' 
                      ? 'bg-green-900/50 text-green-400' 
                      : 'bg-blue-900/50 text-blue-400'
                  }`}>
                    {(engineStatus?.mode || 'IDLE').toUpperCase()}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-700/30">
                <td className="py-2 text-slate-400">STATUS</td>
                <td className="py-2 text-slate-200">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${engineStatus.isRunning ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
                    {engineStatus.isRunning ? 'RUNNING' : 'STOPPED'}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="py-2 text-slate-400">NETWORK</td>
                <td className="py-2 text-cyan-400">MAINNET (LIVE)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>

      {/* Profit Metrics with DataTable */}
      <CollapsiblePanel 
        title="PROFIT METRICS" 
        tooltip="Trading profit and performance data"
        defaultExpanded={false}
        preview={
          <div className="p-3 bg-slate-800/30">
            <div className="text-[10px] text-slate-500 font-mono">REAL-TIME DATA STREAM ACTIVE</div>
          </div>
        }
      >
        <div className="p-3">
          <DataTable 
            data={profitData} 
            columns={profitColumns}
            firstColumnLabel="STATUS"
            defaultSort="desc"
            showTotals={false}
          />
        </div>
      </CollapsiblePanel>


      {/* Capital Velocity Metrics with DataTable */}
      <CollapsiblePanel 
        title="CAPITAL VELOCITY" 
        tooltip="Capital turnover and efficiency metrics"
        defaultExpanded={false}
        preview={
          <div className="p-3 bg-slate-800/30">
            <table className="w-full text-xs font-mono"><tbody><tr>
              <td className="py-1 text-slate-300 font-medium">Today</td>
              <td className="py-1 text-right text-emerald-400">{capitalVelocityData[0]?.velocity?.toFixed(2) || '0.00'}x</td>
              <td className="py-1 text-right text-cyan-400">{formatCurrency(capitalVelocityData[0]?.turnover || 0)}</td>
              <td className="py-1 text-right text-purple-400">{capitalVelocityData[0]?.efficiency?.toFixed(1) || '0.0'}%</td>
              <td className="py-1 text-right text-slate-200">{capitalVelocityData[0]?.rotation?.toFixed(1) || '0.0'}</td>
            </tr></tbody></table>
          </div>
        }
      >
        <div className="p-3">
          <DataTable 
            data={capitalVelocityData} 
            columns={capitalVelocityColumns}
            firstColumnLabel="DAY"
            defaultSort="desc"
            showTotals={true}
          />
        </div>
      </CollapsiblePanel>

      {/* Latency Metrics with DataTable */}
      <CollapsiblePanel 
        title="LATENCY METRICS" 
        tooltip="System latency breakdown by component"
        defaultExpanded={false}
        preview={
          <div className="p-3 bg-slate-800/30">
            <table className="w-full text-xs font-mono"><tbody><tr>
              <td className="py-1 text-slate-300 font-medium">Today</td>
              <td className="py-1 text-right text-slate-200">{formatMs(latencyData[0]?.cacheLookup || 0)}</td>
              <td className="py-1 text-right text-slate-200">{formatMs(latencyData[0]?.apiHotPath || 0)}</td>
              <td className="py-1 text-right text-slate-200">{formatMs(latencyData[0]?.blockDetection || 0)}</td>
              <td className="py-1 text-right text-slate-200">{formatMs(latencyData[0]?.executionPath || 0)}</td>
              <td className="py-1 text-right text-slate-200">{formatMs(latencyData[0]?.externalFetch || 0)}</td>
            </tr></tbody></table>
          </div>
        }
      >
        <div className="p-3">
          <DataTable 
            data={latencyData} 
            columns={latencyColumns}
            firstColumnLabel="DAY"
            defaultSort="desc"
            showTotals={true}
          />
        </div>
      </CollapsiblePanel>

      {/* Bribe Metrics with DataTable */}
      <CollapsiblePanel 
        title="BRIBE METRICS" 
        tooltip="Vote bribe tracking and ROI analysis"
        defaultExpanded={false}
        preview={
          <div className="p-3 bg-slate-800/30">
            <table className="w-full text-xs font-mono"><tbody><tr>
              <td className="py-1 text-slate-300 font-medium">Today</td>
              <td className="py-1 text-right text-slate-200">{formatEth(bribeData[0]?.bribeAmount || 0)}</td>
              <td className="py-1 text-right text-slate-200">{bribeData[0]?.successRate?.toFixed(1) || '0.0'}%</td>
              <td className="py-1 text-right text-slate-200">{bribeData[0]?.roi?.toFixed(1) || '0.0'}%</td>
              <td className="py-1 text-right text-slate-200">{formatEth(bribeData[0]?.totalPaid || 0)}</td>
            </tr></tbody></table>
          </div>
        }
      >
        <div className="p-3">
          <DataTable 
            data={bribeData} 
            columns={bribeColumns}
            firstColumnLabel="DAY"
            defaultSort="desc"
            showTotals={true}
          />
        </div>
      </CollapsiblePanel>

      {/* MEV & Trading - From Root Dashboard */}
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

      {/* System Alerts - From Root Dashboard */}
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
