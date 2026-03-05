import { useState, useEffect } from 'react';
import { useDashboardStore } from '@/stores';
import Tooltip from '@/components/Tooltip';
import CollapsiblePanel from '@/components/CollapsiblePanel';
import {
  Target,
  RefreshCw,
} from 'lucide-react';

interface StrategyProfit {
  name: string;
  profit: number;
  trades: number;
  winRate: number;
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

export default function Strategies() {
  const { stats, isLoading, fetchStats } = useDashboardStore();
  const [viewMode, setViewMode] = useState<ViewMode>('strategies');
  const [strategyProfits, setStrategyProfits] = useState<StrategyProfit[]>([]);
  const [chainProfits, setChainProfits] = useState<ChainProfit[]>([]);
  const [dexProfits, setDexProfits] = useState<DEXProfit[]>([]);
  const [pairProfits, setPairProfits] = useState<PairProfit[]>([]);

  useEffect(() => {
    fetchStats();
    
    setStrategyProfits([
      { name: 'MEV Arbitrage', profit: 4250.50, trades: 145, winRate: 72.5 },
      { name: 'Liquidity Sweep', profit: 2180.25, trades: 89, winRate: 65.2 },
      { name: 'Triangle Arbitrage', profit: 1520.75, trades: 67, winRate: 58.9 },
      { name: 'Cross-DEX Arbitrage', profit: 980.00, trades: 42, winRate: 61.4 },
      { name: 'Flash Loan', profit: 750.25, trades: 23, winRate: 82.6 },
    ]);
    
    setChainProfits([
      { name: 'Ethereum', profit: 5200.00, volume: 1250000 },
      { name: 'Arbitrum', profit: 2100.50, volume: 850000 },
      { name: 'Optimism', profit: 1450.25, volume: 620000 },
      { name: 'Base', profit: 680.00, volume: 320000 },
      { name: 'Polygon', profit: 250.00, volume: 180000 },
    ]);
    
    setDexProfits([
      { name: 'Uniswap V3', profit: 3200.00, volume: 780000 },
      { name: 'Curve', profit: 1850.50, volume: 520000 },
      { name: 'Sushiswap', profit: 1200.25, volume: 380000 },
      { name: 'Balancer', profit: 780.00, volume: 250000 },
      { name: 'Phoenix', profit: 550.00, volume: 180000 },
    ]);
    
    setPairProfits([
      { name: 'ETH/USDC', profit: 2800.00, volume: 650000 },
      { name: 'WBTC/ETH', profit: 1850.50, volume: 480000 },
      { name: 'USDC/USDT', profit: 920.25, volume: 320000 },
      { name: 'ETH/DAI', profit: 750.00, volume: 210000 },
      { name: 'WBTC/USDC', profit: 680.50, volume: 180000 },
    ]);
  }, []);

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

  const totalProfit = currentData().reduce((sum, item) => sum + (item as any).profit, 0);

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

      {/* Data Table */}
      <CollapsiblePanel 
        title={`${viewMode.toUpperCase()} BREAKDOWN`} 
        tooltip={`Profit data by ${viewMode}`}
        defaultExpanded={true}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700/30">
                <th className="text-left py-2 px-3 font-medium">NAME</th>
                <th className="text-right py-2 px-3 font-medium">PROFIT</th>
                {viewMode === 'strategies' && (
                  <>
                    <th className="text-right py-2 px-3 font-medium">TRADES</th>
                    <th className="text-right py-2 px-3 font-medium">WIN RATE</th>
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
                <Tooltip 
                  key={index} 
                  content={
                    viewMode === 'strategies' 
                      ? `${item.trades} trades with ${item.winRate}% win rate`
                      : `Trading volume: ${formatVolume(item.volume)}`
                  }
                >
                  <tr className="border-b border-slate-700/30 hover:bg-slate-800/30 cursor-help">
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
                      </>
                    )}
                    {viewMode !== 'strategies' && (
                      <td className="py-2 px-3 text-right text-slate-400">{formatVolume(item.volume)}</td>
                    )}
                    <td className="py-2 px-3 text-right text-slate-500">
                      {((item.profit / totalProfit) * 100).toFixed(1)}%
                    </td>
                  </tr>
                </Tooltip>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>
    </div>
  );
}
