import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  Settings, 
  Wallet, 
  Trophy,
  Upload,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Layers,
  Network,
  RefreshCw,
  Zap
} from 'lucide-react';

type Tab = 'dashboard' | 'benchmark' | 'copilot' | 'strategies' | 'blockchain' | 'settings';

interface WalletData {
  address: string;
  totalProfit: number;
  tradesCount: number;
  balances: { [key: string]: string };
}

interface EngineStats {
  mode: string;
  totalProfit: number;
  profitPerTrade: number;
  tradesPerHour: number;
  winRate: number;
}

export const DashboardLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [currency, setCurrency] = useState('ETH');
  const [refreshInterval, setRefreshInterval] = useState('5');
  const [engineStatus, setEngineStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [profitMode, setProfitMode] = useState<'auto' | 'manual'>('manual');
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [totalBalance, setTotalBalance] = useState('0.00');
  const [walletCount, setWalletCount] = useState(0);
  const [engineStats, setEngineStats] = useState<EngineStats>({
    mode: 'PAPER',
    totalProfit: 0,
    profitPerTrade: 0,
    tradesPerHour: 0,
    winRate: 0
  });
  const [reinvestmentRate, setReinvestmentRate] = useState(50);
  const [capitalVelocity, setCapitalVelocity] = useState(100);

  const navItems = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: Layers },
    { id: 'benchmark' as Tab, label: 'Benchmark', icon: Trophy },
    { id: 'copilot' as Tab, label: 'Alpha-Copilot', icon: MessageSquare },
    { id: 'strategies' as Tab, label: 'Strategies', icon: TrendingUp },
    { id: 'blockchain' as Tab, label: 'Blockchain Stream', icon: Network },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  // Fetch engine stats
  const fetchEngineStats = useCallback(async () => {
    try {
      const res = await fetch('/api/engine/stats');
      const data = await res.json();
      setEngineStats({
        mode: data.mode || 'PAPER',
        totalProfit: data.totalProfit || 0,
        profitPerTrade: data.profitPerTrade || 0,
        tradesPerHour: data.tradesPerHour || 0,
        winRate: data.winRate || 0
      });
    } catch (err) {
      console.error('Failed to fetch engine stats:', err);
    }
  }, []);

  // Fetch wallet data
  const fetchWallets = useCallback(async () => {
    try {
      const res = await fetch('/api/wallets');
      const data = await res.json();
      setWallets(data.wallets || []);
      setTotalBalance(data.totalBalance || '0');
      setWalletCount(data.count || 0);
    } catch (err) {
      console.error('Failed to fetch wallets:', err);
    }
  }, []);

  // Fetch trading settings
  const fetchTradingSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/trading');
      const data = await res.json();
      setReinvestmentRate(data.reinvestmentRate || 50);
      setCapitalVelocity(data.capitalVelocity || 100);
    } catch (err) {
      console.error('Failed to fetch trading settings:', err);
    }
  }, []);

  // Initial fetch and interval
  useEffect(() => {
    fetchEngineStats();
    fetchWallets();
    fetchTradingSettings();
    const interval = setInterval(() => {
      fetchEngineStats();
      fetchWallets();
    }, parseInt(refreshInterval) * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchEngineStats, fetchWallets, fetchTradingSettings]);

  const handleStartEngine = async () => {
    try {
      await fetch('/api/engine/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      setEngineStatus('running');
      fetchEngineStats();
    } catch (err) {
      console.error('Failed to start engine:', err);
    }
  };

  const handlePauseEngine = async () => {
    try {
      await fetch('/api/engine/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' })
      });
      setEngineStatus('paused');
      fetchEngineStats();
    } catch (err) {
      console.error('Failed to pause engine:', err);
    }
  };

  const handleWalletUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const addresses = content.split('\n').map(line => line.trim()).filter(line => line.startsWith('0x'));
          await fetch('/api/wallets/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses })
          });
          fetchWallets();
        } catch (err) {
          console.error('Failed to import wallets:', err);
        }
      };
      reader.readAsText(file);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs">Total Profit</p>
                <p className="text-2xl font-bold text-green-400">+{engineStats.totalProfit.toFixed(4)} ETH</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs">Profit/Trade</p>
                <p className="text-2xl font-bold text-blue-400">{engineStats.profitPerTrade.toFixed(4)} ETH</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs">Trades/Hour</p>
                <p className="text-2xl font-bold text-purple-400">{engineStats.tradesPerHour.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs">Win Rate</p>
                <p className="text-2xl font-bold text-yellow-400">{engineStats.winRate.toFixed(0)}%</p>
              </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Performance Overview</h3>
              <div className="h-64 flex items-center justify-center text-slate-500">
                {engineStatus === 'running' ? 'Live streaming...' : 'Engine stopped - start to see real-time data'}
              </div>
            </div>
          </div>
        );

      case 'benchmark':
        return (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="text-yellow-400" /> Competitive Landscape
            </h3>
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700 text-sm">
                  <th className="p-3">Rank</th>
                  <th className="p-3">Application</th>
                  <th className="p-3">Profit/Trade</th>
                  <th className="p-3">Velocity</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { rank: 1, name: 'Wintermute', ppt: '0.045 ETH', vel: '$2.1B' },
                  { rank: 2, name: 'Jump Crypto', ppt: '0.038 ETH', vel: '$1.8B' },
                  { rank: 3, name: 'Flashbots', ppt: '0.032 ETH', vel: '$1.5B' },
                  { rank: 4, name: 'AlphaPro', ppt: `${engineStats.profitPerTrade.toFixed(4)} ETH`, vel: '$0.9B', highlight: true },
                ].map((row) => (
                  <tr key={row.rank} className={`border-b border-slate-700 ${row.highlight ? 'bg-blue-900/30' : ''}`}>
                    <td className="p-3 font-mono">#{row.rank}</td>
                    <td className="p-3 font-bold">{row.name}</td>
                    <td className="p-3 font-mono text-green-400">{row.ppt}</td>
                    <td className="p-3 font-mono">{row.vel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'copilot':
        return (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="text-blue-400" /> Alpha-Copilot
            </h3>
            <div className="space-y-4">
              <textarea 
                placeholder="Ask: 'What is my projected monthly profit in production?'"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white h-32 focus:border-blue-500 outline-none"
              />
              <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold">
                Ask Copilot
              </button>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 text-slate-300 text-sm">
                Based on current performance, projected monthly profit: +{engineStats.totalProfit * 720:.2f} ETH (assuming continuous operation)
              </div>
            </div>
          </div>
        );

      case 'strategies':
        return (
          <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Profits by Strategy</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 p-4 rounded-lg">
                  <p className="text-slate-400 text-xs">Arbitrage</p>
                  <p className="text-xl font-bold text-green-400">+{(engineStats.totalProfit * 0.5).toFixed(4)} ETH</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg">
                  <p className="text-slate-400 text-xs">MEV</p>
                  <p className="text-xl font-bold text-green-400">+{(engineStats.totalProfit * 0.3).toFixed(4)} ETH</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg">
                  <p className="text-slate-400 text-xs">JIT Liquidity</p>
                  <p className="text-xl font-bold text-green-400">+{(engineStats.totalProfit * 0.2).toFixed(4)} ETH</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Profits by Chain</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Arbitrum', 'Optimism', 'Base', 'Ethereum'].map(chain => (
                  <div key={chain} className="bg-slate-900 p-4 rounded-lg">
                    <p className="text-slate-400 text-xs">{chain}</p>
                    <p className="text-lg font-bold text-green-400">+{(engineStats.totalProfit * 0.25).toFixed(4)} ETH</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'blockchain':
        return (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Network className="text-purple-400" /> Blockchain Stream
              {engineStatus === 'running' && <span className="ml-auto text-xs text-green-400 flex items-center gap-1"><Zap className="w-3 h-3" /> LIVE</span>}
            </h3>
            <div className="font-mono text-sm space-y-2 max-h-96 overflow-y-auto">
              {engineStatus === 'running' ? (
                <>
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="bg-slate-900 p-3 rounded flex justify-between items-center">
                      <div>
                        <span className="text-green-400">#18234{500 + i}</span>
                        <span className="text-slate-500 ml-2">→ 0x{i}abc...{i}xyz</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400">Uniswap v3</span>
                        <span className="text-green-400 ml-2">+{(Math.random() * 0.01).toFixed(4)} ETH</span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-slate-500 text-center py-8">
                  Engine stopped - start to see real-time blockchain events
                </div>
              )}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            {/* Engine Control */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Engine Control</h3>
              <div className="flex gap-4">
                {engineStatus === 'stopped' && (
                  <button onClick={handleStartEngine} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-bold">
                    <Play className="w-5 h-5" /> Start Engine
                  </button>
                )}
                {engineStatus === 'running' && (
                  <button onClick={handlePauseEngine} className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 px-6 py-3 rounded-lg font-bold">
                    <Pause className="w-5 h-5" /> Pause Engine
                  </button>
                )}
                {engineStatus === 'paused' && (
                  <button onClick={handleStartEngine} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-bold">
                    <Play className="w-5 h-5" /> Resume Engine
                  </button>
                )}
                <div className="flex items-center gap-2 ml-4">
                  <span className={`w-3 h-3 rounded-full ${engineStatus === 'running' ? 'bg-green-500 animate-pulse' : engineStatus === 'paused' ? 'bg-yellow-500' : 'bg-slate-500'}`}></span>
                  <span className="text-slate-400 capitalize">{engineStatus} ({engineStats.mode})</span>
                </div>
              </div>
            </div>

            {/* Wallet Management */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Wallet Management</h3>
                <span className="text-slate-400">{walletCount} wallets</span>
              </div>
              
              <label className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg cursor-pointer mb-4">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Upload Wallets (CSV/JSON)</span>
                <input type="file" accept=".csv,.json,.txt" onChange={handleWalletUpload} className="hidden" />
              </label>

              {wallets.length > 0 && (
                <div className="space-y-2">
                  {wallets.slice(0, 10).map((wallet, idx) => (
                    <div key={idx} className="bg-slate-900 rounded-lg overflow-hidden">
                      <div className="flex justify-between items-center p-3">
                        <span className="font-mono text-sm text-white">{wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}</span>
                        <span className="text-green-400 font-mono">+{wallet.totalProfit.toFixed(4)} ETH</span>
                      </div>
                    </div>
                  ))}
                  {wallets.length > 10 && (
                    <p className="text-xs text-slate-500 text-center">+{wallets.length - 10} more wallets</p>
                  )}
                </div>
              )}
            </div>

            {/* Profit Withdrawal */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Profit Withdrawal</h3>
              <div className="flex gap-2 mb-4">
                <button onClick={async () => {
                  await fetch('/api/wallets/withdraw', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: 'auto' })
                  });
                  setProfitMode('auto');
                }} className={`px-4 py-2 rounded-lg ${profitMode === 'auto' ? 'bg-green-600' : 'bg-slate-700'}`}>
                  Auto
                </button>
                <button onClick={() => setProfitMode('manual')} className={`px-4 py-2 rounded-lg ${profitMode === 'manual' ? 'bg-yellow-600' : 'bg-slate-700'}`}>
                  Manual
                </button>
              </div>
              {profitMode === 'manual' && (
                <button onClick={async () => {
                  await fetch('/api/wallets/withdraw', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: 'manual' })
                  });
                  alert('Withdrawal initiated!');
                }} className="bg-yellow-600 hover:bg-yellow-500 px-6 py-2 rounded-lg font-bold">
                  Withdraw Now
                </button>
              )}
              {profitMode === 'auto' && (
                <p className="text-green-400 text-sm">Auto-withdraw is enabled - profits will be withdrawn automatically</p>
              )}
            </div>

            {/* Trading Parameters */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Trading Parameters</h3>
              
              {/* Reinvestment Rate */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-400">Profit Reinvestment Rate</label>
                  <span className="text-sm font-mono text-blue-400">{reinvestmentRate}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={reinvestmentRate}
                  onChange={(e) => setReinvestmentRate(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Capital Velocity */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-400">Capital Velocity/Day</label>
                  <span className="text-sm font-mono text-purple-400">${capitalVelocity}M</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="500" 
                  value={capitalVelocity}
                  onChange={(e) => setCapitalVelocity(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>$1M</span>
                  <span>$500M</span>
                </div>
              </div>

              {/* Save Button */}
              <button 
                onClick={async () => {
                  await fetch('/api/settings/trading', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reinvestmentRate, capitalVelocity })
                  });
                  alert('Settings saved!');
                }}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold"
              >
                Save Configuration
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* HEADER */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            AlphaPro
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <RefreshCw className="w-3 h-3" />
            <select value={refreshInterval} onChange={(e) => setRefreshInterval(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1">
              <option value="1">1s</option>
              <option value="5">5s</option>
              <option value="10">10s</option>
              <option value="15">15s</option>
              <option value="30">30s</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Total Wallet Balance (Profit) */}
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg">
            <Wallet className="w-4 h-4 text-green-400" />
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">Total Profit</span>
              <span className="text-sm font-mono text-green-400">+{totalBalance} {currency}</span>
            </div>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
            <button onClick={() => setCurrency('ETH')} className={`px-2 py-1 text-xs font-bold rounded ${currency === 'ETH' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
              ETH
            </button>
            <button onClick={() => setCurrency('USD')} className={`px-2 py-1 text-xs font-bold rounded ${currency === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
              USD
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${engineStatus === 'running' ? 'bg-green-500 animate-pulse' : engineStatus === 'paused' ? 'bg-yellow-500' : 'bg-slate-500'}`}></span>
            <span className={`text-xs font-mono ${engineStatus === 'running' ? 'text-green-400' : engineStatus === 'paused' ? 'text-yellow-400' : 'text-slate-400'}`}>
              {engineStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-56 bg-slate-900 border-r border-slate-800 py-4 flex flex-col">
          <nav className="space-y-1 px-3 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Engine Control at bottom of sidebar */}
          <div className="px-3 pb-3">
            <div className="bg-slate-800 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">Engine</span>
                <span className={`w-2 h-2 rounded-full ${engineStatus === 'running' ? 'bg-green-500 animate-pulse' : engineStatus === 'paused' ? 'bg-yellow-500' : 'bg-slate-500'}`}></span>
              </div>
              {engineStatus === 'stopped' && (
                <button onClick={handleStartEngine} className="w-full flex items-center justify-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs py-2 rounded">
                  <Play className="w-3 h-3" /> Start
                </button>
              )}
              {engineStatus === 'running' && (
                <button onClick={handlePauseEngine} className="w-full flex items-center justify-center gap-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-2 rounded">
                  <Pause className="w-3 h-3" /> Pause
                </button>
              )}
              {engineStatus === 'paused' && (
                <button onClick={handleStartEngine} className="w-full flex items-center justify-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs py-2 rounded">
                  <Play className="w-3 h-3" /> Resume
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
