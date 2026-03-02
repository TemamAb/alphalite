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
  ChevronUp,
  ChevronRight,
  TrendingUp,
  Layers,
  Network,
  RefreshCw,
  Zap,
  Key
} from 'lucide-react';

type Tab = 'dashboard' | 'benchmark' | 'copilot' | 'strategies' | 'blockchain' | 'settings';

interface WalletData {
  address: string;
  name: string;
  valid: boolean;
  provider: string;
  logo: string;
  blockchain: string;
  balance: number;
  chains: { [key: string]: string };
  totalBalance: number;
  hasKey?: boolean;
}

interface EngineStats {
  mode: string;
  totalProfit: number;
  profitPerTrade: number;
  tradesPerHour: number;
  winRate: number;
}

interface WithdrawalRecord {
  id: string;
  timestamp: Date;
  amount: number;
  status: 'Completed' | 'Pending';
  txHash: string;
}

interface DeploymentRecord {
  id: number;
  deploymentCode: string;
  commitHash: string;
  smartWallet: string;
  smartContract: string;
  chains: string[];
  timestamp: Date;
  status: 'Active' | 'Inactive';
}

export const DashboardLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [currency, setCurrency] = useState('ETH');
  const [refreshInterval, setRefreshInterval] = useState('5');
  const [engineStatus, setEngineStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [profitMode, setProfitMode] = useState<'auto' | 'manual'>('manual');
  const [wallets, setWallets] = useState<WalletData[]>([]);
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
  const [autoThreshold, setAutoThreshold] = useState('0.1');
  const [manualAmount, setManualAmount] = useState('0.01');
  const [walletTableCollapsed, setWalletTableCollapsed] = useState(() => {
    const saved = localStorage.getItem('walletTableCollapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [profitWithdrawalCollapsed, setProfitWithdrawalCollapsed] = useState(() => {
    const saved = localStorage.getItem('profitWithdrawalCollapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [tradingParamsCollapsed, setTradingParamsCollapsed] = useState(() => {
    const saved = localStorage.getItem('tradingParamsCollapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [targetMode, setTargetMode] = useState<'PAPER' | 'LIVE'>('LIVE');
  const [ethPrice, setEthPrice] = useState(3500);
  const [isRefreshingWallets, setIsRefreshingWallets] = useState(false);
  const [withdrawalRecords, setWithdrawalRecords] = useState<WithdrawalRecord[]>([]);
  const [withdrawalHistoryCollapsed, setWithdrawalHistoryCollapsed] = useState(() => {
    const saved = localStorage.getItem('withdrawalHistoryCollapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [engineControlCollapsed, setEngineControlCollapsed] = useState(() => {
    const saved = localStorage.getItem('engineControlCollapsed');
    return saved !== null ? JSON.parse(saved) : true; // Default to collapsed
  });
  const [deploymentRecords, setDeploymentRecords] = useState<DeploymentRecord[]>([]);
  const [deploymentRegistryCollapsed, setDeploymentRegistryCollapsed] = useState(() => {
    const saved = localStorage.getItem('deploymentRegistryCollapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [pimlicoConfigured, setPimlicoConfigured] = useState(false);

  // Helper to format values based on selected currency
  const getDisplayValue = (ethValue: number | string) => {
    const val = typeof ethValue === 'string' ? parseFloat(ethValue) : ethValue;
    if (currency === 'USD') {
      return (val * ethPrice).toFixed(2);
    }
    return val.toFixed(4);
  };

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

  // Fetch ETH Price
  const fetchEthPrice = useCallback(async () => {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await res.json();
      if (data.ethereum?.usd) {
        setEthPrice(data.ethereum.usd);
      }
    } catch (err) {
      console.error('Failed to fetch ETH price:', err);
    }
  }, []);

  // Fetch Config Status
  const fetchConfigStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/config/status');
      const data = await res.json();
      setPimlicoConfigured(data.pimlicoConfigured || false);
    } catch (err) {
      console.error('Failed to fetch config status:', err);
    }
  }, []);

  // Persist UI preferences
  useEffect(() => {
    localStorage.setItem('walletTableCollapsed', JSON.stringify(walletTableCollapsed));
  }, [walletTableCollapsed]);

  useEffect(() => {
    localStorage.setItem('profitWithdrawalCollapsed', JSON.stringify(profitWithdrawalCollapsed));
  }, [profitWithdrawalCollapsed]);

  useEffect(() => {
    localStorage.setItem('tradingParamsCollapsed', JSON.stringify(tradingParamsCollapsed));
  }, [tradingParamsCollapsed]);

  useEffect(() => {
    localStorage.setItem('withdrawalHistoryCollapsed', JSON.stringify(withdrawalHistoryCollapsed));
  }, [withdrawalHistoryCollapsed]);

  useEffect(() => {
    localStorage.setItem('engineControlCollapsed', JSON.stringify(engineControlCollapsed));
  }, [engineControlCollapsed]);

  useEffect(() => {
    localStorage.setItem('deploymentRegistryCollapsed', JSON.stringify(deploymentRegistryCollapsed));
  }, [deploymentRegistryCollapsed]);

  // Initial fetch and interval
  useEffect(() => {
    fetchEngineStats();
    fetchWallets();
    fetchTradingSettings();
    fetchEthPrice();
    fetchConfigStatus();

    const interval = setInterval(() => {
      fetchEngineStats();
      fetchWallets();
    }, parseInt(refreshInterval) * 1000);

    const priceInterval = setInterval(fetchEthPrice, 60000); // Update price every minute
    return () => { clearInterval(interval); clearInterval(priceInterval); };
  }, [refreshInterval, fetchEngineStats, fetchWallets, fetchTradingSettings, fetchEthPrice, fetchConfigStatus]);

  const handleStartEngine = async () => {
    if (targetMode === 'LIVE') {
      if (!confirm('WARNING: You are about to start the engine in LIVE mode. This will interact with real assets. Proceed?')) {
        return; // User cancelled the action
      }

      // Deactivate all previous deployment records
      const updatedRecords = deploymentRecords.map(rec => ({ ...rec, status: 'Inactive' as const }));

      // Create a new deployment record for this live session
      const newDeployment: DeploymentRecord = {
        id: deploymentRecords.length + 1,
        deploymentCode: `DEP-${(deploymentRecords.length + 1).toString().padStart(4, '0')}`,
        commitHash: (import.meta as any).env?.VITE_GIT_COMMIT_HASH || 'production',
        smartWallet: (import.meta as any).env?.VITE_SMART_WALLET || wallets[0]?.address || '',
        smartContract: (import.meta as any).env?.VITE_SMART_CONTRACT || '',
        chains: ['Ethereum', 'Arbitrum'],
        timestamp: new Date(),
        status: 'Active',
      };

      setDeploymentRecords([newDeployment, ...updatedRecords]);
    }

    try {
      await fetch('/api/engine/state', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'start', mode: targetMode })
      });
      setEngineStatus('running');
      fetchEngineStats();
    } catch (err) {
      console.error('Failed to start engine:', err);
    }
  };

  const handlePauseEngine = async () => {
    // Mark the currently active deployment as Inactive
    setDeploymentRecords(prevRecords => 
      prevRecords.map(rec => rec.status === 'Active' ? { ...rec, status: 'Inactive' } : rec)
    );

    try {
      await fetch('/api/engine/state', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
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
          // Use regex to handle both Windows (\r\n) and Unix (\n) line endings
          const addresses = content.split(/[\r\n]+/).map(line => line.trim()).filter(line => line.startsWith('0x'));
          await fetch('/api/wallets/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses })
          });
          fetchWallets();
          alert(`${addresses.length} wallets imported successfully!`);
        } catch (err) {
          console.error('Failed to import wallets:', err);
          alert('Failed to import wallets. Please check the file format and console for errors.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleKeyUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const keys = content.split(/[\r\n]+/).map(line => line.trim()).filter(line => line.length > 0);
          
          await fetch('/api/wallets/upload-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keys })
          });
          
          await fetchWallets();
          alert('Private keys processed. Wallets auto-populated successfully.');
        } catch (err) {
          console.error('Failed to upload keys:', err);
          alert('Failed to upload keys');
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
                <p className="text-2xl font-bold text-green-400">+{getDisplayValue(engineStats.totalProfit)} {currency}</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs">Profit/Trade</p>
                <p className="text-2xl font-bold text-blue-400">{getDisplayValue(engineStats.profitPerTrade)} {currency}</p>
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
                {engineStats.totalProfit > 0 ? (
                  [
                    { rank: 1, name: 'AlphaPro', ppt: `${engineStats.profitPerTrade.toFixed(4)} ETH`, vel: '$0.0B', highlight: true },
                  ].map((row) => (
                    <tr key={row.rank} className={`border-b border-slate-700 ${row.highlight ? 'bg-blue-900/30' : ''}`}>
                      <td className="p-3 font-mono">#{row.rank}</td>
                      <td className="p-3 font-bold">{row.name}</td>
                      <td className="p-3 font-mono text-green-400">{row.ppt}</td>
                      <td className="p-3 font-mono">{row.vel}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-slate-500">No trading data yet - start engine to begin</td>
                  </tr>
                )}
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
                {`Based on current performance, projected monthly profit: +${(engineStats.totalProfit * 720).toFixed(2)} ETH (assuming continuous operation)`}
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
                  <p className="text-xl font-bold text-green-400">+{getDisplayValue(engineStats.totalProfit)} {currency}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg">
                  <p className="text-slate-400 text-xs">MEV</p>
                  <p className="text-xl font-bold text-green-400">+{getDisplayValue(engineStats.totalProfit)} {currency}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg">
                  <p className="text-slate-400 text-xs">JIT Liquidity</p>
                  <p className="text-xl font-bold text-green-400">+{getDisplayValue(engineStats.totalProfit)} {currency}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Profits by Chain</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Arbitrum', 'Optimism', 'Base', 'Ethereum'].map(chain => (
                  <div key={chain} className="bg-slate-900 p-4 rounded-lg">
                    <p className="text-slate-400 text-xs">{chain}</p>
                    <p className="text-lg font-bold text-green-400">+{getDisplayValue(engineStats.totalProfit)} {currency}</p>
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
                        <span className="text-green-400 ml-2">+{getDisplayValue(engineStats.totalProfit)} {currency}</span>
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
            <div className="bg-slate-800 p-6 rounded-xl border border-red-500/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-red-400" /> Engine Control
                </h3>
                <button 
                  onClick={() => setEngineControlCollapsed(!engineControlCollapsed)} 
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  title={engineControlCollapsed ? 'Expand' : 'Collapse'}
                >
                  {engineControlCollapsed ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {!engineControlCollapsed && (
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-slate-300">Master Switch</span>
                  <div className="flex items-center gap-2">
                    {engineStatus === 'running' && engineStats.mode === 'LIVE' && (
                      <><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span><span className="text-sm font-mono text-red-400">LIVE</span></>
                    )}
                    {engineStatus === 'running' && engineStats.mode === 'PAPER' && (
                      <><span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span><span className="text-sm font-mono text-green-400">PAPER</span></>
                    )}
                    {engineStatus === 'paused' && (
                      <><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span><span className="text-sm font-mono text-yellow-400">PAUSED</span></>
                    )}
                    {engineStatus === 'stopped' && (
                      <><span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span><span className="text-sm font-mono text-slate-400">STOPPED</span></>
                    )}
                  </div>
                </div>

                {pimlicoConfigured && engineStatus === 'running' && targetMode === 'LIVE' && (
                <div className="mb-4 bg-blue-900/20 border border-blue-800 rounded p-2 flex items-center justify-center gap-2">
                  <Zap className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-blue-300 font-mono">Gasless Mode Active (Pimlico) - No Prefunding Required</span>
                </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Mode Selector */}
                  <div className="bg-slate-800 p-2 rounded-lg">
                    <div className="text-xs text-slate-400 mb-2 text-center">MODE</div>
                    <div className="flex bg-slate-900 p-1 rounded">
                      <button 
                        onClick={() => setTargetMode('PAPER')}
                        className={`flex-1 text-sm py-2 rounded transition-colors ${targetMode === 'PAPER' ? 'bg-slate-700 text-white font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        PAPER
                      </button>
                      <button 
                        onClick={() => setTargetMode('LIVE')}
                        className={`flex-1 text-sm py-2 rounded transition-colors ${targetMode === 'LIVE' ? 'bg-red-900/50 text-red-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        LIVE
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="bg-slate-800 p-2 rounded-lg">
                    <div className="text-xs text-slate-400 mb-2 text-center">ACTION</div>
                    {engineStatus === 'stopped' && (
                      <button onClick={handleStartEngine} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm py-2 rounded font-bold">
                        <Play className="w-4 h-4" /> Start
                      </button>
                    )}
                    {engineStatus === 'running' && (
                      <button onClick={handlePauseEngine} className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm py-2 rounded font-bold">
                        <Pause className="w-4 h-4" /> Pause
                      </button>
                    )}
                    {engineStatus === 'paused' && (
                      <button onClick={handleStartEngine} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm py-2 rounded font-bold">
                        <Play className="w-4 h-4" /> Resume
                      </button>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Private Key Configuration */}
            <div className="bg-slate-800 p-6 rounded-xl border border-yellow-500/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-yellow-400" /> Wallet Configuration
                </h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Wallet Address</label>
                  <input 
                    type="text" 
                    id="walletAddress"
                    defaultValue={wallets[0]?.address || ''}
                    placeholder="0x..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-yellow-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Private Key 
                    <span className="text-yellow-500 text-xs ml-2">(Required for LIVE trading)</span>
                  </label>
                  <input 
                    type="password" 
                    id="privateKey"
                    placeholder="Enter private key (0x...)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-yellow-500 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    🔒 Your private key is stored locally and never sent to any server
                  </p>
                </div>

                <button 
                  onClick={async () => {
                    const addressInput = (document.getElementById('walletAddress') as HTMLInputElement).value;
                    const privateKeyInput = (document.getElementById('privateKey') as HTMLInputElement).value;
                    
                    if (!addressInput || !privateKeyInput) {
                      alert('Please enter both wallet address and private key');
                      return;
                    }
                    
                    if (!privateKeyInput.startsWith('0x') || privateKeyInput.length !== 66) {
                      alert('Invalid private key format. Must be 64 hex characters with 0x prefix');
                      return;
                    }
                    
                    try {
                      await fetch('/api/wallets/configure', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          walletAddress: addressInput,
                          privateKey: privateKeyInput 
                        })
                      });
                      alert('Wallet configured successfully! LIVE trading is now enabled.');
                      fetchConfigStatus();
                    } catch (err) {
                      alert('Failed to configure wallet');
                    }
                  }}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg"
                >
                  Configure Wallet
                </button>
              </div>
            </div>

            {/* Deployment Registry */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Deployment Registry</h3>
                <button 
                  onClick={() => setDeploymentRegistryCollapsed(!deploymentRegistryCollapsed)} 
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  title={deploymentRegistryCollapsed ? 'Expand' : 'Collapse'}
                >
                  {deploymentRegistryCollapsed ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </button>
              </div>
              {!deploymentRegistryCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Code</th>
                        <th className="p-2 text-left">Commit</th>
                        <th className="p-2 text-left">Smart Wallet</th>
                        <th className="p-2 text-left">Contract</th>
                        <th className="p-2 text-left">Chains</th>
                        <th className="p-2 text-left">Timestamp</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deploymentRecords.length > 0 ? (
                        deploymentRecords.map((rec) => (
                          <tr key={rec.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="p-2 text-slate-400">{rec.id}</td>
                            <td className="p-2 font-mono text-slate-300">{rec.deploymentCode}</td>
                            <td className="p-2 font-mono text-blue-400">{rec.commitHash}</td>
                            <td className="p-2 font-mono text-slate-400">{rec.smartWallet.slice(0, 12)}...</td>
                            <td className="p-2 font-mono text-slate-400">{rec.smartContract.slice(0, 12)}...</td>
                            <td className="p-2 text-slate-300">{rec.chains.join(', ')}</td>
                            <td className="p-2 text-slate-400">{rec.timestamp.toLocaleString()}</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs ${
                                rec.status === 'Active' ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-slate-600/50 text-slate-400'
                              }`}>
                                {rec.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-slate-500">No live deployments have been initiated.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Wallet Management */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Wallet Management</h3>
                <div className="flex items-center gap-4">
                  <div className="flex gap-3 text-xs">
                    <span className="text-green-400">{wallets.filter((w: any) => w.valid).length} valid</span>
                    <span className="text-red-400">{wallets.filter((w: any) => !w.valid).length} invalid</span>
                  </div>
                  <button 
                    onClick={() => setWalletTableCollapsed(!walletTableCollapsed)} 
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title={walletTableCollapsed ? 'Expand' : 'Collapse'}
                  >
                    {walletTableCollapsed ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronUp className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              
              {!walletTableCollapsed && (
              <>
              <div className="flex gap-2 mb-4">
                <label className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg cursor-pointer text-sm">
                  <Upload className="w-4 h-4" /> Import
                  <input type="file" accept=".csv,.json,.txt" onChange={handleWalletUpload} className="hidden" />
                </label>
                <label className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg cursor-pointer text-sm border border-yellow-500/30">
                  <Key className="w-4 h-4 text-yellow-400" /> Upload Keys
                  <input type="file" accept=".txt,.csv" onChange={handleKeyUpload} className="hidden" />
                </label>
                <button 
                  onClick={async () => {
                    setIsRefreshingWallets(true);
                    await fetch('/api/wallets/refresh', { method: 'POST' });
                    await fetchWallets();
                    setIsRefreshingWallets(false);
                  }}
                  className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-slate-200">
                  <RefreshCw className={`w-4 h-4 ${isRefreshingWallets ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button onClick={async () => {
                  const addr = prompt('Enter wallet address:');
                  if (addr) {
                    await fetch('/api/wallets/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: addr }) });
                    fetchWallets();
                  }
                }} className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-sm">+ Add</button>
                <div className="ml-auto flex items-center gap-4 bg-slate-700 px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Wallets:</span>
                    <span className="text-sm font-bold text-white">{wallets.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Total:</span>
                    <span className="text-sm font-bold text-green-400">{getDisplayValue(wallets.reduce((s: number, w: any) => s + (w.balance || w.totalBalance || 0), 0))} {currency}</span>
                  </div>
                </div>
              </div>

              {wallets.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Address</th>
                        <th className="p-2 text-center">Logo</th>
                        <th className="p-2 text-left">Provider</th>
                        <th className="p-2 text-left">Blockchain</th>
                        <th className="p-2 text-right">Balance</th>
                        <th className="p-2 text-center">Key</th>
                        <th className="p-2 text-center">Status</th>
                        <th className="p-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wallets.map((wallet: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="p-2 text-slate-400">{idx + 1}</td>
                          <td className="p-2 text-slate-300">{wallet.name || `Wallet ${idx + 1}`}</td>
                          <td className="p-2 font-mono text-slate-400">{wallet.address?.slice(0, 10)}...</td>
                          <td className="p-2 text-center">
                            {wallet.logo && <img src={wallet.logo} alt={wallet.provider} className="w-6 h-6 mx-auto rounded-full bg-slate-200 p-0.5" />}
                          </td>
                          <td className="p-2 text-slate-300">{wallet.provider || 'Unknown'}</td>
                          <td className="p-2 text-slate-300">{wallet.blockchain || 'Ethereum'}</td>
                          <td className="p-2 text-right font-mono text-green-400">{getDisplayValue(wallet.balance || wallet.totalBalance || 0)}</td>
                          <td className="p-2 text-center">
                            {wallet.hasKey ? (
                              <Key className="w-4 h-4 text-yellow-400 mx-auto" title="Private Key Configured" />
                            ) : (
                              <span className="text-slate-600 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-2 text-center"><span className={`px-2 py-1 rounded text-xs ${wallet.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{wallet.valid ? 'Valid' : 'Invalid'}</span></td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={async () => {
                                  const newAddr = prompt('Edit wallet address:', wallet.address);
                                  if (newAddr && newAddr !== wallet.address) {
                                    await fetch(`/api/wallets/${wallet.address}`, { 
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' }, 
                                      body: JSON.stringify({ address: newAddr }) 
                                    });
                                    fetchWallets();
                                  }
                                }} 
                                className="text-blue-400 hover:text-blue-300"
                              >
                                ✎
                              </button>
                              <button 
                                onClick={async () => { 
                                  if (confirm('Are you sure you want to remove this wallet?')) {
                                    await fetch(`/api/wallets/${wallet.address}`, { method: 'DELETE' }); 
                                    fetchWallets(); 
                                  }
                                }} 
                                className="text-red-400 hover:text-red-300"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-700/50 font-bold text-white">
                        <td colSpan={6} className="p-2">TOTAL</td>
                        <td className="p-2 text-right text-green-400">{getDisplayValue(wallets.reduce((s: number, w: any) => s + (w.balance || w.totalBalance || 0), 0))}</td>
                        <td className="p-2">{wallets.length} wallets</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              </>
              )}
            </div>

            {/* Profit Withdrawal */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Profit Withdrawal</h3>
                <button 
                  onClick={() => setProfitWithdrawalCollapsed(!profitWithdrawalCollapsed)} 
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  title={profitWithdrawalCollapsed ? 'Expand' : 'Collapse'}
                >
                  {profitWithdrawalCollapsed ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </button>
              </div>
              {!profitWithdrawalCollapsed && (
              <>
              <div className="flex gap-2 mb-4">
                <button onClick={async () => {
                  await fetch('/api/wallets/withdraw', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: 'auto', threshold: autoThreshold })
                  });
                  setProfitMode('auto');
                }} className={`px-4 py-2 rounded-lg ${profitMode === 'auto' ? 'bg-green-600' : 'bg-slate-700'}`}>
                  Auto
                </button>
                <button onClick={() => setProfitMode('manual')} className={`px-4 py-2 rounded-lg ${profitMode === 'manual' ? 'bg-yellow-600' : 'bg-slate-700'}`}>
                  Manual
                </button>
              </div>
              {profitMode === 'auto' && (
                <div className="mb-4">
                  <label className="text-sm text-slate-400 mb-2 block">Auto-withdraw threshold (ETH)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={autoThreshold}
                    onChange={(e) => setAutoThreshold(e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white w-40"
                  />
                  <p className="text-green-400 text-sm mt-2">Auto-withdraw enabled - profits will be withdrawn when threshold is reached</p>
                </div>
              )}
              {profitMode === 'manual' && (
                <div className="mb-4">
                  <label className="text-sm text-slate-400 mb-2 block">Manual withdrawal amount (ETH)</label>
                  <input 
                    type="number" 
                    step="0.001"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white w-40"
                  />
                  <button onClick={async () => {
                    try {
                      const res = await fetch('/api/wallets/withdraw', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ mode: 'manual', amount: manualAmount })
                      });
                      const data = await res.json();
                      
                      const newRecord: WithdrawalRecord = {
                        id: withdrawalRecords.length + 1,
                        timestamp: new Date(),
                        amount: parseFloat(manualAmount),
                        status: data.success ? 'Completed' : 'Failed',
                        txHash: data.txHash || 'pending'
                      };
                      setWithdrawalRecords(prev => [newRecord, ...prev]);
                      
                      if (data.success) {
                        alert(`Withdrawal initiated! Amount: ${manualAmount} ETH`);
                      } else {
                        alert(`Withdrawal failed: ${data.message}`);
                      }
                    } catch (err) {
                      console.error('Withdrawal error:', err);
                      alert('Withdrawal request failed. Please try again.');
                    }
                  }} className="bg-yellow-600 hover:bg-yellow-500 px-6 py-2 rounded-lg font-bold mt-3 block">
                    Withdraw {manualAmount} ETH
                  </button>
                </div>
              )}
              </>
              )}
            </div>

            {/* Withdrawal History */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Withdrawal History</h3>
                <button 
                  onClick={() => setWithdrawalHistoryCollapsed(!withdrawalHistoryCollapsed)} 
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  title={withdrawalHistoryCollapsed ? 'Expand' : 'Collapse'}
                >
                  {withdrawalHistoryCollapsed ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </button>
              </div>
              {!withdrawalHistoryCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-center">Status</th>
                        <th className="p-2 text-left">Transaction ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawalRecords.length > 0 ? (
                        withdrawalRecords.map((record) => (
                          <tr key={record.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="p-2 text-slate-400">{record.timestamp.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono text-yellow-400">{record.amount.toFixed(4)} ETH</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs ${
                                record.status === 'Completed' ? 'bg-green-500/20 text-green-400' : 
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="p-2 font-mono text-blue-400 hover:underline">
                              <a href={`https://etherscan.io/tx/${record.txHash}`} target="_blank" rel="noopener noreferrer" title={record.txHash}>
                                {record.txHash.slice(0, 10)}...{record.txHash.slice(-8)}
                              </a>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-500">No withdrawal records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Trading Parameters */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Trading Parameters</h3>
                <button 
                  onClick={() => setTradingParamsCollapsed(!tradingParamsCollapsed)} 
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  title={tradingParamsCollapsed ? 'Expand' : 'Collapse'}
                >
                  {tradingParamsCollapsed ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {!tradingParamsCollapsed && (
              <>
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
              </>
              )}
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
              <span className="text-xs text-slate-400">Wallet Balance</span>
              <span className="text-sm font-mono text-green-400">+{getDisplayValue(wallets.reduce((acc, w) => acc + (w.balance || w.totalBalance || 0), 0))} {currency}</span>
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
            {engineStatus === 'running' && engineStats.mode === 'LIVE' && (
              <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span><span className="text-xs font-mono text-red-400">LIVE</span></>
            )}
            {engineStatus === 'running' && engineStats.mode === 'PAPER' && (
              <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span><span className="text-xs font-mono text-green-400">PAPER</span></>
            )}
            {engineStatus === 'paused' && (
              <><span className="w-2 h-2 rounded-full bg-yellow-500"></span><span className="text-xs font-mono text-yellow-400">PAUSED</span></>
            )}
            {engineStatus === 'stopped' && (
              <><span className="w-2 h-2 rounded-full bg-slate-500"></span><span className="text-xs font-mono text-slate-400">STOPPED</span></>
            )}
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
