import React, { useState } from 'react';
import { 
  MessageSquare, 
  LineChart, 
  Settings, 
  Wallet, 
  Activity, 
  Trophy,
  Upload,
  DollarSign,
  Radio,
  Zap,
  Pause,
  Play,
  ChevronDown,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

type Tab = 'benchmark' | 'copilot' | 'strategies' | 'blockchain' | 'settings';

interface WalletData {
  address: string;
  balances: { [chain: string]: string };
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<Tab>('strategies');
  const [currency, setCurrency] = useState('ETH');
  const [refreshInterval, setRefreshInterval] = useState('5');
  const [engineStatus, setEngineStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [profitMode, setProfitMode] = useState<'auto' | 'manual'>('manual');
  
  // Wallet state
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [totalBalance, setTotalBalance] = useState('0.00');
  const [walletCount, setWalletCount] = useState(0);
  const [expandedWallets, setExpandedWallets] = useState<Set<number>>(new Set());

  const tabs = [
    { id: 'benchmark' as Tab, label: 'Benchmark', icon: Trophy },
    { id: 'copilot' as Tab, label: 'Alpha-Copilot', icon: MessageSquare },
    { id: 'strategies' as Tab, label: 'Strategies', icon: LineChart },
    { id: 'blockchain' as Tab, label: 'Blockchain Stream', icon: Radio },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  const handleWalletUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const addresses = content.split('\n').map(line => line.trim()).filter(line => line.startsWith('0x'));
          const newWallets: WalletData[] = addresses.map(addr => ({
            address: addr,
            balances: { Ethereum: '0.00', Arbitrum: '0.00', Optimism: '0.00', Base: '0.00', Polygon: '0.00' }
          }));
          setWallets(newWallets);
          setWalletCount(newWallets.length);
          setTotalBalance((newWallets.length * 12.458).toFixed(2));
        } catch (err) {
          console.error('Failed to parse wallet file', err);
        }
      };
      reader.readAsText(file);
    }
  };

  const toggleWalletExpand = (index: number) => {
    const newExpanded = new Set(expandedWallets);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedWallets(newExpanded);
  };

  const handleEngineStart = () => {
    setEngineStatus('running');
  };

  const handleEnginePause = () => {
    setEngineStatus('paused');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            AlphaPro
          </h1>
          <p className="text-xs text-slate-500 font-mono">v1.0.0-RC1</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Panels */}
        <div className="p-3 border-t border-slate-800 space-y-3 max-h-96 overflow-y-auto">
          
          {/* Benchmark Panel */}
          {activeTab === 'benchmark' && (
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <h4 className="text-xs font-bold text-slate-300 mb-2">Competitor Rankings</h4>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-yellow-400">
                  <span>#1 Wintermute</span>
                  <span>0.045 ETH</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>#2 Jump Crypto</span>
                  <span>0.038 ETH</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>#3 Flashbots</span>
                  <span>0.032 ETH</span>
                </div>
                <div className="flex justify-between text-blue-400 border-t border-slate-700 pt-1 mt-1">
                  <span>AlphaPro</span>
                  <span>0.028 ETH</span>
                </div>
              </div>
            </div>
          )}

          {/* Copilot Panel */}
          {activeTab === 'copilot' && (
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <h4 className="text-xs font-bold text-slate-300 mb-2">Quick Ask</h4>
              <input 
                type="text" 
                placeholder="Ask about profits..." 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
              />
              <button className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-1.5 rounded">
                Ask Copilot
              </button>
            </div>
          )}

          {/* Strategies Panel */}
          {activeTab === 'strategies' && (
            <div className="space-y-3">
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <h4 className="text-xs font-bold text-slate-300 mb-2">Profits by Strategy</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Arbitrage</span>
                    <span className="text-green-400">+4.2 ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">MEV</span>
                    <span className="text-green-400">+2.8 ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">JIT Liquidity</span>
                    <span className="text-green-400">+1.5 ETH</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <h4 className="text-xs font-bold text-slate-300 mb-2">Profits by Chain</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Arbitrum</span>
                    <span className="text-green-400">+3.2 ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Optimism</span>
                    <span className="text-green-400">+2.1 ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Base</span>
                    <span className="text-green-400">+1.8 ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ethereum</span>
                    <span className="text-green-400">+1.4 ETH</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Blockchain Stream Panel */}
          {activeTab === 'blockchain' && (
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-3 h-3 text-purple-400 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-300">Live Events</h4>
              </div>
              <div className="space-y-1 font-mono text-xs text-slate-400 max-h-40 overflow-y-auto">
                <p className="text-green-400">✓ Block #18234567</p>
                <p className="text-slate-500">→ TX: 0x3a2f...8b9c</p>
                <p className="text-slate-500">→ Flash: Uniswap v3</p>
                <p className="text-slate-500">→ Profit: +0.0042 ETH</p>
                <p className="text-slate-500">---</p>
                <p className="text-blue-400">→ New block: #18234568</p>
                <p className="text-slate-500">→ TX: 0x7d4e...2a1f</p>
                <p className="text-slate-500">→ Pair: WBTC/ETH</p>
                <p className="text-green-400">→ Profit: +0.0031 ETH</p>
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              {/* Engine Controls */}
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <h4 className="text-xs font-bold text-slate-300 mb-2">Engine Control</h4>
                <div className="flex gap-2">
                  {engineStatus === 'stopped' && (
                    <button 
                      onClick={handleEngineStart}
                      className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs py-2 rounded"
                    >
                      <Play className="w-3 h-3" />
                      Start
                    </button>
                  )}
                  {engineStatus === 'running' && (
                    <button 
                      onClick={handleEnginePause}
                      className="flex-1 flex items-center justify-center gap-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-2 rounded"
                    >
                      <Pause className="w-3 h-3" />
                      Pause
                    </button>
                  )}
                  {engineStatus === 'paused' && (
                    <button 
                      onClick={handleEngineStart}
                      className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs py-2 rounded"
                    >
                      <Play className="w-3 h-3" />
                      Resume
                    </button>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    engineStatus === 'running' ? 'bg-green-500 animate-pulse' : 
                    engineStatus === 'paused' ? 'bg-yellow-500' : 'bg-slate-500'
                  }`}></span>
                  <span className="text-xs text-slate-400 capitalize">{engineStatus}</span>
                </div>
              </div>

              {/* Wallet Panel */}
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3 h-3 text-blue-400" />
                    <h4 className="text-xs font-bold text-slate-300">Wallet Panel</h4>
                  </div>
                  <span className="text-xs text-slate-500">{walletCount} wallets</span>
                </div>
                
                <label className="w-full flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-1.5 rounded cursor-pointer mb-2">
                  <Upload className="w-3 h-3" />
                  Upload Wallets
                  <input type="file" accept=".csv,.json,.txt" onChange={handleWalletUpload} className="hidden" />
                </label>

                {wallets.length > 0 && (
                  <div className="max-h-48 overflow-y-auto">
                    {wallets.slice(0, 5).map((wallet, idx) => (
                      <div key={idx} className="mb-1">
                        <button 
                          onClick={() => toggleWalletExpand(idx)}
                          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white py-1"
                        >
                          <span className="truncate">{wallet.address.slice(0, 10)}...</span>
                          {expandedWallets.has(idx) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                        {expandedWallets.has(idx) && (
                          <div className="pl-2 text-xs text-slate-500 space-y-0.5 pb-1">
                            <div className="flex justify-between"><span>ETH:</span><span>1.2</span></div>
                            <div className="flex justify-between"><span>ARB:</span><span>2.5</span></div>
                            <div className="flex justify-between"><span>OP:</span><span>0.8</span></div>
                          </div>
                        )}
                      </div>
                    ))}
                    {wallets.length > 5 && (
                      <p className="text-xs text-slate-500 text-center">+{wallets.length - 5} more</p>
                    )}
                  </div>
                )}
              </div>

              {/* Profit Withdrawal */}
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-3 h-3 text-green-400" />
                  <h4 className="text-xs font-bold text-slate-300">Profit Withdrawal</h4>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setProfitMode('auto')}
                    className={`flex-1 text-xs py-1.5 rounded ${profitMode === 'auto' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                  >
                    Auto
                  </button>
                  <button 
                    onClick={() => setProfitMode('manual')}
                    className={`flex-1 text-xs py-1.5 rounded ${profitMode === 'manual' ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                  >
                    Manual
                  </button>
                </div>
                {profitMode === 'auto' && (
                  <p className="text-xs text-green-400 mt-2">Auto-withdraw enabled</p>
                )}
                {profitMode === 'manual' && (
                  <button className="mt-2 w-full bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-1.5 rounded">
                    Withdraw Now
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
          <div>
            <h2 className="text-lg font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Refresh:</span>
              <select 
                value={refreshInterval} 
                onChange={(e) => setRefreshInterval(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-300"
              >
                <option value="1">1s</option>
                <option value="5">5s</option>
                <option value="10">10s</option>
                <option value="15">15s</option>
                <option value="30">30s</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Total Wallet Balance */}
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg">
              <Wallet className="w-4 h-4 text-blue-400" />
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">Total Balance</span>
                <span className="text-sm font-mono text-white">{totalBalance} {currency}</span>
              </div>
            </div>

            {/* Currency Toggle */}
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
              <button 
                onClick={() => setCurrency('ETH')}
                className={`px-2 py-1 text-xs font-bold rounded ${currency === 'ETH' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                ETH
              </button>
              <button 
                onClick={() => setCurrency('USD')}
                className={`px-2 py-1 text-xs font-bold rounded ${currency === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                USD
              </button>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                engineStatus === 'running' ? 'bg-green-500 animate-pulse' : 
                engineStatus === 'paused' ? 'bg-yellow-500' : 'bg-slate-500'
              }`}></span>
              <span className={`text-xs font-mono ${engineStatus === 'running' ? 'text-green-400' : engineStatus === 'paused' ? 'text-yellow-400' : 'text-slate-400'}`}>
                {engineStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
