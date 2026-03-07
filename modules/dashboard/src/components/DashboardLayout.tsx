import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDashboardStore, useAuthStore } from '@/stores';
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
} from 'lucide-react';
import VolatilityGauge from './VolatilityGauge';
import LiquidityMonitor from './LiquidityMonitor';
import WhaleFeed from './WhaleFeed';
import BribeMonitor from './BribeMonitor';

// Header Component
function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { stats, refreshInterval, setRefreshInterval, fetchStats, fetchDeployments, wallets, fetchWalletBalances, engineStatus } = useDashboardStore();
  const [currency, setCurrency] = useState<'ETH' | 'USD'>('ETH');
  const [localRefreshInterval, setLocalRefreshInterval] = useState('5s');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate total wallet balance from all wallets
  const totalWalletBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const displayBalance = currency === 'ETH' 
    ? `${totalWalletBalance.toFixed(4)} ETH` 
    : `${(totalWalletBalance * 2500).toFixed(2)}`; // Simplified ETH price

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
    
    const interval = setInterval(async () => {
      setIsRefreshing(true);
      await Promise.all([fetchStats(), fetchDeployments(), fetchWalletBalances()]);
      setIsRefreshing(false);
    }, refreshInterval);
    
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
          AlphaPro <span className="text-sm font-normal text-slate-400">v1.0.0-RC1</span>
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
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700"
              >
                ETH
              </button>
              <button
                onClick={() => { setCurrency('USD'); setIsDropdownOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700"
              >
                USD
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

        {/* Engine Status - from store */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className={`w-2 h-2 rounded-full animate-pulse ${engineStatus.isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-green-400">{engineStatus.isRunning ? engineStatus.mode.toUpperCase() : 'STOPPED'}</span>
        </div>

        {/* Wallet Balance - from store wallets */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
          <Wallet className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-white font-medium">
            Wallet Balance: {wallets.length > 0 ? `${totalWalletBalance.toFixed(3)} ETH` : 'No wallet'}
          </span>
        </div>

        {/* Uptime */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Activity className="w-4 h-4" />
          <span>{stats.uptime.toFixed(1)}%</span>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-700">
          <span className="text-sm text-slate-300">{user?.email || 'admin@alphapro.io'}</span>
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
    { to: '/rankings', icon: Target, label: 'Rankings', badge: null },
    { to: '/strategies', icon: Cpu, label: 'Strategies', badge: null },
    { to: '/bribes', icon: Banknote, label: 'Bribe Monitor', badge: null },
    { to: '/ai-optimizer', icon: Bot, label: 'AI Optimizer', badge: null },
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

          {/* Bribe Monitor Widget */}
          <div className="px-2 pb-4"><BribeMonitor /></div>
        </>
      )}
    </aside>
  );
}

// Main Layout
export default function DashboardLayout() {
  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
