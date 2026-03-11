import { useState, useEffect, useMemo } from 'react';
import { useDashboardStore } from '@/stores';
import Tooltip from '@/components/Tooltip';
import CollapsiblePanel from '@/components/CollapsiblePanel';
import {
  Target,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Extended strategy interface with enable/disable state
interface StrategyItem {
  id: number;
  name: string;
  profit: number;
  trades: number;
  winRate: number;
  volume: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  enabled: boolean;
  profitMultiplier: number;
  description: string;
}

interface ChainProfit {
  name: string;
  profit: number;
  volume: number;
}

interface DEXProfit {
  name: string;
  profit: number;
  volume: number;
}

interface PairProfit {
  name: string;
  profit: number;
  volume: number;
}

type ViewMode = 'strategies' | 'chains' | 'dexes' | 'pairs';

// Default 20 strategies with sample data
const DEFAULT_STRATEGIES: StrategyItem[] = [
  { id: 1, name: 'Flash Loan', profit: 45230.50, trades: 145, winRate: 78, volume: 1250000, risk: 'HIGH', enabled: true, profitMultiplier: 3.0, description: 'Maximum profit using borrowed funds' },
  { id: 2, name: 'Cross-DEX', profit: 32150.75, trades: 203, winRate: 72, volume: 980000, risk: 'MEDIUM', enabled: true, profitMultiplier: 2.0, description: 'Price differences across exchanges' },
  { id: 3, name: 'Triangular', profit: 18920.25, trades: 312, winRate: 81, volume: 650000, risk: 'LOW', enabled: true, profitMultiplier: 1.5, description: 'Price differences within single DEX' },
  { id: 4, name: 'LVR', profit: 12450.00, trades: 89, winRate: 65, volume: 420000, risk: 'LOW', enabled: false, profitMultiplier: 1.0, description: 'Liquidity Provider Revenue' },
  { id: 5, name: 'Sandwich Attack', profit: 56780.30, trades: 67, winRate: 85, volume: 2100000, risk: 'HIGH', enabled: true, profitMultiplier: 2.5, description: 'Front-running and back-running' },
  { id: 6, name: 'JIT Liquidity', profit: 21340.80, trades: 156, winRate: 74, volume: 780000, risk: 'MEDIUM', enabled: true, profitMultiplier: 1.8, description: 'Just-In-Time liquidity provision' },
  { id: 7, name: 'Liquidations', profit: 38920.45, trades: 98, winRate: 69, volume: 1450000, risk: 'MEDIUM', enabled: true, profitMultiplier: 2.2, description: 'Undercollateralized loan liquidations' },
  { id: 8, name: 'Spatial Arbitrage', profit: 15670.20, trades: 234, winRate: 77, volume: 520000, risk: 'LOW', enabled: false, profitMultiplier: 1.7, description: 'Geographical market differences' },
  { id: 9, name: 'Statistical Arbitrage', profit: 11230.60, trades: 445, winRate: 68, volume: 380000, risk: 'LOW', enabled: true, profitMultiplier: 1.4, description: 'Statistical mispricing detection' },
  { id: 10, name: 'Funding Rate Arbitrage', profit: 19870.90, trades: 178, winRate: 75, volume: 620000, risk: 'LOW', enabled: true, profitMultiplier: 1.6, description: 'Funding rate differences' },
  { id: 11, name: 'Basis Trading', profit: 8760.30, trades: 267, winRate: 71, volume: 290000, risk: 'LOW', enabled: false, profitMultiplier: 1.3, description: 'Spot vs futures price differences' },
  { id: 12, name: 'Volatility Arbitrage', profit: 24560.70, trades: 123, winRate: 73, volume: 890000, risk: 'MEDIUM', enabled: true, profitMultiplier: 1.9, description: 'Implied vs realized volatility' },
  { id: 13, name: 'Cross-Chain Arbitrage', profit: 62340.20, trades: 45, winRate: 82, volume: 3200000, risk: 'HIGH', enabled: true, profitMultiplier: 2.8, description: 'Cross-blockchain price differences' },
  { id: 14, name: 'MEV Extract', profit: 48920.60, trades: 89, winRate: 79, volume: 1800000, risk: 'HIGH', enabled: true, profitMultiplier: 2.4, description: 'Transaction ordering extraction' },
  { id: 15, name: 'Dex Aggregator', profit: 9870.40, trades: 512, winRate: 76, volume: 340000, risk: 'LOW', enabled: false, profitMultiplier: 1.45, description: 'Multi-DEX optimization' },
  { id: 16, name: 'Index Rebalance', profit: 6540.80, trades: 34, winRate: 88, volume: 210000, risk: 'LOW', enabled: false, profitMultiplier: 1.25, description: 'Index fund rebalancing events' },
  { id: 17, name: 'Oracle Manipulation', profit: 41230.90, trades: 56, winRate: 71, volume: 1650000, risk: 'HIGH', enabled: true, profitMultiplier: 2.6, description: 'Oracle feed exploitation' },
  { id: 18, name: 'Uniswap V3 Tick', profit: 18230.50, trades: 189, winRate: 77, volume: 720000, risk: 'MEDIUM', enabled: true, profitMultiplier: 1.55, description: 'Concentrated liquidity optimization' },
  { id: 19, name: 'Curve StableSwap', profit: 5430.20, trades: 678, winRate: 83, volume: 180000, risk: 'LOW', enabled: true, profitMultiplier: 1.2, description: 'Stablecoin arbitrage' },
  { id: 20, name: 'NFT Floor Arbitrage', profit: 28760.70, trades: 78, winRate: 64, volume: 950000, risk: 'MEDIUM', enabled: false, profitMultiplier: 2.1, description: 'NFT marketplace differences' },
];

export default function Strategies() {
  const { stats, isLoading, fetchStats } = useDashboardStore();
  const [viewMode, setViewMode] = useState<ViewMode>('strategies');
  const [strategyProfits, setStrategyProfits] = useState<StrategyItem[]>(DEFAULT_STRATEGIES);
  const [chainProfits, setChainProfits] = useState<ChainProfit[]>([]);
  const [dexProfits, setDexProfits] = useState<DEXProfit[]>([]);
  const [pairProfits, setPairProfits] = useState<PairProfit[]>([]);
  const [isTableCollapsed, setIsTableCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchStats();
    
    setChainProfits([]);
    setDexProfits([]);
    setPairProfits([]);
  }, []);

  // Toggle strategy enabled/disabled
  const toggleStrategy = (id: number) => {
    setStrategyProfits(prev => prev.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  // Calculate totals for enabled strategies
  const strategyTotals = useMemo(() => {
    const enabled = strategyProfits.filter(s => s.enabled);
    return {
      count: enabled.length,
      profit: enabled.reduce((sum, s) => sum + s.profit, 0),
      trades: enabled.reduce((sum, s) => sum + s.trades, 0),
      volume: enabled.reduce((sum, s) => sum + s.volume, 0),
      avgWinRate: enabled.length > 0 
        ? enabled.reduce((sum, s) => sum + s.winRate, 0) / enabled.length 
        : 0,
    };
  }, [strategyProfits]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatVolume = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value}`;
  };

  const currentData = () => {
    switch (viewMode) {
      case 'strategies':
        return strategyProfits;
      case 'chains':
        return chainProfits;
      case 'dexes':
        return dexProfits;
      case 'pairs':
        return pairProfits;
      default:
        return strategyProfits;
    }
  };

  const totalProfit = currentData().reduce((sum, item: any) => sum + (item.profit || 0), 0);

  // Get risk color
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH': return 'text-red-400 bg-red-900/20';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-900/20';
      case 'LOW': return 'text-green-400 bg-green-900/20';
      default: return 'text-slate-400 bg-slate-800';
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-mono">STRATEGIES</h2>
          <p className="text-xs text-slate-500 font-mono">Profit breakdown analysis</p>
        </div>
        <Tooltip content="Refresh strategy data from API">
          <button
            onClick={() => fetchStats()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 text-slate-300 text-xs font-mono rounded hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </Tooltip>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-1 flex-wrap">
        {(['strategies', 'chains', 'dexes', 'pairs'] as ViewMode[]).map((mode) => (
          <Tooltip key={mode} content={`View profits by ${mode}`}>
            <button
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                viewMode === mode
                  ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-700'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {mode.toUpperCase()}
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Total Summary */}
      <CollapsiblePanel 
        title="TOTAL SUMMARY" 
        tooltip={`Total ${viewMode} profit`}
        defaultExpanded={true}
      >
        <div className="p-3">
          <table className="w-full text-xs font-mono">
            <tbody>
              <tr className="border-b border-slate-700/30">
                <td className="py-2 text-slate-400 w-1/3">TOTAL PROFIT</td>
                <td className="py-2 text-green-400 text-lg">{formatCurrency(totalProfit)}</td>
              </tr>
              <tr className="border-b border-slate-700/30">
                <td className="py-2 text-slate-400">ACTIVE {viewMode.toUpperCase()}</td>
                <td className="py-2 text-slate-200">{currentData().length}</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-400">TOP PERFORMER</td>
                <td className="py-2 text-cyan-400">{currentData()[0]?.name || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>

      {/* Data Table with Collapse/Expand */}
      <CollapsiblePanel 
        title={`${viewMode.toUpperCase()} BREAKDOWN (${strategyTotals.count}/20 ENABLED)`} 
        tooltip={`Profit data by ${viewMode}`}
        defaultExpanded={true}
      >
        <div className="space-y-2">
          {/* Collapse/Expand Toggle Button */}
          {viewMode === 'strategies' && (
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setIsTableCollapsed(!isTableCollapsed)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-colors"
              >
                {isTableCollapsed ? (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    EXPAND TABLE
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    COLLAPSE TABLE
                  </>
                )}
              </button>
              
              {/* Summary in collapsed mode */}
              {isTableCollapsed && (
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-slate-400">
                    ENABLED: <span className="text-cyan-400">{strategyTotals.count}</span>
                  </span>
                  <span className="text-slate-400">
                    PROFIT: <span className="text-green-400">{formatCurrency(strategyTotals.profit)}</span>
                  </span>
                  <span className="text-slate-400">
                    TRADES: <span className="text-white">{strategyTotals.trades.toLocaleString()}</span>
                  </span>
                  <span className="text-slate-400">
                    AVG WIN: <span className="text-yellow-400">{strategyTotals.avgWinRate.toFixed(1)}%</span>
                  </span>
                </div>
              )}
            </div>
          )}

          <div className={`overflow-x-auto ${isTableCollapsed ? 'max-h-48' : ''}`}>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700/30">
                  {viewMode === 'strategies' && (
                    <th className="text-left py-2 px-3 font-medium w-16">ENABLE</th>
                  )}
                  <th className="text-left py-2 px-3 font-medium">NAME</th>
                  <th className="text-right py-2 px-3 font-medium">PROFIT</th>
                  {viewMode === 'strategies' && (
                    <>
                      <th className="text-right py-2 px-3 font-medium">TRADES</th>
                      <th className="text-right py-2 px-3 font-medium">WIN RATE</th>
                      <th className="text-center py-2 px-3 font-medium">RISK</th>
                    </>
                  )}
                  {viewMode !== 'strategies' && (
                    <th className="text-right py-2 px-3 font-medium">VOLUME</th>
                  )}
                  <th className="text-right py-2 px-3 font-medium">% SHARE</th>
                </tr>
              </thead>
              <tbody>
                {currentData().map((item: any, index: number) => (
                  <tr key={index} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                    {/* Enable/Disable Toggle for Strategies */}
                    {viewMode === 'strategies' && (
                      <td className="py-2 px-3">
                        <Tooltip content={item.enabled ? 'Disable strategy' : 'Enable strategy'}>
                          <button
                            onClick={() => toggleStrategy(item.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.enabled 
                                ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' 
                                : 'bg-red-900/20 text-red-400 hover:bg-red-900/40'
                            }`}
                          >
                            {item.enabled ? (
                              <Power className="w-3.5 h-3.5" />
                            ) : (
                              <PowerOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </Tooltip>
                      </td>
                    )}
                    
                    <td className="py-2 px-3 text-slate-200">{item.name}</td>
                    <td className={`py-2 px-3 text-right ${item.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(item.profit)}
                    </td>
                    
                    {viewMode === 'strategies' && (
                      <>
                        <td className="py-2 px-3 text-right text-slate-400">{item.trades}</td>
                        <td className="py-2 px-3 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            item.winRate >= 70 ? 'bg-green-900/30 text-green-400' :
                            item.winRate >= 50 ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-red-900/30 text-red-400'
                          }`}>
                            {item.winRate}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${getRiskColor(item.risk)}`}>
                            {item.risk}
                          </span>
                        </td>
                      </>
                    )}
                    
                    {viewMode !== 'strategies' && (
                      <td className="py-2 px-3 text-right text-slate-400">{formatVolume(item.volume)}</td>
                    )}
                    
                    <td className="py-2 px-3 text-right text-slate-500">
                      {totalProfit > 0 ? ((item.profit / totalProfit) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
              
              {/* Totals Row - Always Visible */}
              {viewMode === 'strategies' && (
                <tfoot className="bg-slate-700/50 border-t-2 border-slate-500">
                  <tr>
                    <td className="py-2 px-3 text-white font-bold">TOTAL</td>
                    <td className="py-2 px-3"></td>
                    <td className="py-2 px-3 text-right text-green-400 font-bold">{formatCurrency(strategyTotals.profit)}</td>
                    <td className="py-2 px-3 text-right text-white font-bold">{strategyTotals.trades.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-yellow-400 font-bold">{strategyTotals.avgWinRate.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-center text-slate-400 font-bold">-</td>
                    <td className="py-2 px-3 text-right text-slate-400 font-bold">100%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Controls */}
          {viewMode === 'strategies' && (
            <div className="flex items-center justify-between px-3 py-3 border-t border-slate-600 bg-slate-800/50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, strategyProfits.length)} of {strategyProfits.length}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.ceil(strategyProfits.length / pageSize) }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 text-xs rounded ${
                      currentPage === page 
                        ? 'bg-cyan-500 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(strategyProfits.length / pageSize), p + 1))}
                  disabled={currentPage >= Math.ceil(strategyProfits.length / pageSize)}
                  className="p-1.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </CollapsiblePanel>
    </div>
  );
}
