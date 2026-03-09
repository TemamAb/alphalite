import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDashboardStore, useAuthStore, useSystemStore } from '@/stores';
import {
  LayoutDashboard,
  HeartPulse,
  Settings,
  Search,
  LogOut,
  Menu,
  X,
  RefreshCw,
  Wallet,
  Zap,
  Activity,
  ChevronDown,
  Network,
  Bot,
  Target,
  Gauge,
  Cpu,
  Shield,
  Banknote,
  ScrollText,
} from 'lucide-react';
import VolatilityGauge from './VolatilityGauge';
import LiquidityMonitor from './LiquidityMonitor';
import WhaleFeed from './WhaleFeed';
import TradeFeed from './TradeFeed';
import ConnectionStatus from './ConnectionStatus';
import Tooltip from './Tooltip';

// Header Component
function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { stats, refreshInterval, setRefreshInterval, fetchStats, fetchDeployments, wallets, fetchWalletBalances, engineStatus } = useDashboardStore();
  const [currency, setCurrency] = useState<'ETH' | 'USD'>('ETH');
  const [ethPrice, setEthPrice] = useState<number>(2500); // Default fallback price
  const [localRefreshInterval, setLocalRefreshInterval] = useState('5s');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real-time ETH price from multiple reliable sources
  const fetchEthPrice = useCallback(async () => {
    try {
      // Try CoinGecko API (free, reliable)
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.ethereum?.usd) {
          setEthPrice(data.ethereum.usd);
          return;
        }
      }
      
      // Fallback: Try Binance API
      const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
      if (binanceResponse.ok) {
        const binanceData = await binanceResponse.json();
        if (binanceData.price) {
          setEthPrice(parseFloat(binanceData.price));
          return;
        }
      }
      
      // Fallback: Try CoinCap API
      const coinCapResponse = await fetch('https://api.coincap.io/v2/assets/ethereum');
      if (coinCapResponse.ok) {
        const coinCapData = await coinCapResponse.json();
        if (coinCapData.data?.priceUsd) {
          setEthPrice(parseFloat(coinCapData.data.priceUsd));
        }
      }
    } catch (error) {
      console.error('Failed to fetch ETH price:', error);
      // Keep the default price on error
    }
  }, []);

  // Auto-refresh ETH price every 30 seconds
  useEffect(() => {
    fetchEthPrice();
    const priceInterval = setInterval(fetchEthPrice, 30000);
    return () => clearInterval(priceInterval);
  }, [fetchEthPrice]);

  // Calculate total wallet balance from all wallets
  const totalWalletBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const displayBalance = currency === 'ETH' 
    ? `${totalWalletBalance.toFixed(4)} ETH` 
    : `${(totalWalletBalance * ethPrice).toFixed(2)} USD`;

  // Convert refresh interval string to milliseconds
  const parseInterval = (val: string): number => {
    return parseInt(val.replace('s', '')) * 1000;
  };

  // Handle refresh interval change
  const handleIntervalChange = (val: string) => {
    setLocalRefreshInterval(val);
    const ms = parseInterval(val);
    setRefreshInterval(ms);
  };

  // Auto-refresh effect
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const fetchData = async () => {
      setIsRefreshing(true);
      await Promise.all([fetchStats(), fetchDeployments(), fetchWalletBalances()]);
      setIsRefreshing(false);
    };

    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval, fetchStats, fetchDeployments, fetchWalletBalances]);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchStats(), fetchDeployments(), fetchWalletBalances()]);
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
      {/* Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">
          AlphaPro <span className="text-sm font-normal text-slate-400">{import.meta.env.VITE_APP_VERSION || 'v1.0.0'}</span>
        </h1>
      </div>

      {/* Center - Search Bar */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search deployments, wallets, transactions... (Ctrl+K)"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Currency Toggle */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg text-sm text-white hover:bg-slate-700 transition-colors"
          >
            {currency}
            <ChevronDown className="w-3 h-3" />
          </button>
          {isDropdownOpen && (
            <div className="absolute top-full mt-1 right-0 bg-slate-800 border border-slate-600 rounded-lg shadow-lg overflow-hidden z-50">
              <button
                onClick={() => { setCurrency('ETH'); setIsDropdownOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center justify-between"
              >
                <span>ETH</span>
                <span className="text-xs text-slate-400">${ethPrice.toLocaleString()}</span>
              </button>
              <button
                onClick={() => { setCurrency('USD'); setIsDropdownOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center justify-between"
              >
                <span>USD</span>
                <span className="text-xs text-slate-400">1 ETH = ${ethPrice.toLocaleString()}</span>
              </button>
            </div>
          )}
        </div>

        {/* Refresh Interval */}
        <select
          value={localRefreshInterval}
          onChange={(e) => handleIntervalChange(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none"
        >
          <option value="1s">1s</option>
          <option value="5s">5s</option>
          <option value="10s">10s</option>
          <option value="15s">15s</option>
          <option value="30s">30s</option>
        </select>

        {/* Manual Refresh Button */}
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className={`p-2 text-slate-400 hover:text-white transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
          title="Refresh now"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Connection Status */}
        <ConnectionStatus />

        {/* Engine Status - Redesigned */}
        <div className="flex items-center gap-3 px-3 py-1 bg-slate-800 rounded-lg border border-slate-700">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              Engine
            </span>
            <span className={`text-sm font-bold leading-tight ${engineStatus.isRunning ? 'text-green-400' : 'text-red-400'}`}>
              {engineStatus.isRunning ? engineStatus.mode.toUpperCase() : 'STOPPED'}
            </span>
          </div>
          <div className={`p-1.5 rounded-md ${engineStatus.isRunning ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <Activity className={`w-5 h-5 ${engineStatus.isRunning ? 'text-green-400 animate-pulse' : 'text-red-400'}`} />
          </div>
        </div>

        {/* Wallet Balance - Redesigned */}
        <Tooltip
          content={
            <div className="space-y-2">
              <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1">Connected Wallets</div>
              {wallets.length > 0 ? (
                wallets.map((w, i) => (
                  <div key={i} className="flex justify-between gap-4 text-xs">
                    <span className="font-mono text-slate-400">{w.address.slice(0, 6)}...{w.address.slice(-4)}</span>
                    <span className="text-white">{(w.balance || 0).toFixed(4)} ETH</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic text-xs">No wallets connected</div>
              )}
            </div>
          }
          position="bottom"
        >
          <div className="flex items-center gap-3 px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 cursor-help">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {wallets.length} {wallets.length === 1 ? 'Wallet' : 'Wallets'}
              </span>
              <span className="text-sm font-bold text-white leading-tight">
                {wallets.length > 0 ? displayBalance : '0.00'}
              </span>
            </div>
            <div className="p-1.5 bg-yellow-500/10 rounded-md">
              <Wallet className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        </Tooltip>

        {/* Uptime */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Activity className="w-4 h-4" />
          <span>{stats.uptime.toFixed(1)}%</span>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-700">
<span className="text-sm text-slate-300">{user?.email || 'Not logged in'}</span>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

// Sidebar Component
function Sidebar() {
  const { stats } = useDashboardStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { to: '/home', icon: LayoutDashboard, label: 'Home', badge: null },
    { to: '/strategies', icon: Cpu, label: 'Strategies', badge: null },
    { to: '/ai-optimizer', icon: Bot, label: 'AI Optimizer', badge: null },
    { to: '/blockchain-stream', icon: Activity, label: 'Blockchain Stream', badge: null },
    { to: '/logs', icon: ScrollText, label: 'Logs', badge: null },
    { to: '/wallets', icon: Wallet, label: 'Wallets', badge: null },
    { to: '/security', icon: Shield, label: 'Security', badge: null },
    { to: '/health', icon: HeartPulse, label: 'Health', badge: null },
    { to: '/settings', icon: Settings, label: 'Settings', badge: null },
  ];

  return (
    <aside
      className={`bg-slate-900 border-r border-slate-700 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Collapse Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {!isCollapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.badge !== null && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-slate-700 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* System Status */}
      {!isCollapsed && (
        <>
          <div className="p-4 border-t border-slate-700">
            <div className="text-xs text-slate-500 mb-2">SYSTEM STATUS</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">API Instances</span>
                <span className="text-green-400">{stats.healthyDeployments}/{stats.totalDeployments}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Avg Latency</span>
                <span className="text-white">{stats.avgLatency.toFixed(0)}ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Requests/min</span>
                <span className="text-white">{stats.totalRequests.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Volatility Gauge Widget */}
          <div className="px-2 pb-4"><VolatilityGauge /></div>

          {/* Liquidity Monitor Widget */}
          <div className="px-2 pb-4"><LiquidityMonitor /></div>

          {/* Whale Feed Widget */}
          <div className="px-2 pb-4"><WhaleFeed /></div>
        </>
      )}
    </aside>
  );
}

// Main Layout
export default function DashboardLayout() {
  const { connect } = useSystemStore();

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      <Header />
      <TradeFeed />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
