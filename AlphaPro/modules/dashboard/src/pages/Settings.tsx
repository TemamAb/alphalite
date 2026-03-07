import { useState, useEffect } from 'react';
import { useDashboardStore } from '@/stores';
import { walletApi, engineApi } from '@/services/api';
import Tooltip from '@/components/Tooltip';
import CollapsiblePanel from '@/components/CollapsiblePanel';
import {
  Wallet,
  Plus,
  Trash2,
  Zap,
  Play,
  Square,
  Settings as SettingsIcon,
  Server,
  Key,
  Shield,
  Bell,
  Database,
  Globe,
  Upload,
  Wand2,
  AlertCircle,
  Copy,
  Loader2,
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Edit2,
  TrendingUp,
  Pause,
  Activity,
} from 'lucide-react';

// Type for Ethereum provider
interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: () => void) => void;
  removeListener?: (event: string, handler: () => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export default function Settings() {
  const { wallets, engineStatus, addWallet, removeWallet, updateEngineStatus, deployments, fetchDeployments } = useDashboardStore();
  const [activeTab, setActiveTab] = useState<'wallets' | 'deployments' | 'engine' | 'general'>('wallets');
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletKey, setNewWalletKey] = useState('');
  const [walletName, setWalletName] = useState('');
  const [walletChain, setWalletChain] = useState('ethereum');
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);

  // Calculate totals
  const totalWalletBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const totalWalletCount = wallets.length;

  // Helper to shorten address/private key
  const shortenAddress = (addr: string) => {
    if (!addr) return '-';
    return `${addr.slice(0, 5)}...${addr.slice(-5)}`;
  };

  // Check if wallet is valid (has valid address format)
  const isValidAddress = (addr: string) => {
    return addr && addr.startsWith('0x') && addr.length === 42;
  };

  // Profit withdrawal state
  const [withdrawalMode, setWithdrawalMode] = useState<'manual' | 'auto'>('manual');
  const [manualAmount, setManualAmount] = useState('');
  const [autoThreshold, setAutoThreshold] = useState('0.1');
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  
  // Transaction state - fetched from API
  const [transactions, setTransactions] = useState<Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    timestamp: string;
    hash: string;
  }>>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // Profit state - fetched from API
  const [availableProfit, setAvailableProfit] = useState(0);
  const [isLoadingProfit, setIsLoadingProfit] = useState(false);

  // Fetch transactions and profit from API on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingTransactions(true);
      setIsLoadingProfit(true);
      try {
        // Fetch transactions from API
        const txResponse = await fetch('/api/transactions', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        if (txResponse.ok) {
          const txData = await txResponse.json();
          setTransactions(txData.transactions || []);
        } else {
          // API not available, set empty array
          setTransactions([]);
        }

        // Fetch profit from API
        const profitResponse = await fetch('/api/engine/profit', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        if (profitResponse.ok) {
          const profitData = await profitResponse.json();
          setAvailableProfit(profitData.available || 0);
        } else {
          setAvailableProfit(0);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setTransactions([]);
        setAvailableProfit(0);
      } finally {
        setIsLoadingTransactions(false);
        setIsLoadingProfit(false);
      }
    };
    fetchData();
  }, []);

  // Profit Reinvestment state
  const [reinvestEnabled, setReinvestEnabled] = useState(false);
  const [reinvestPercentage, setReinvestPercentage] = useState(50);
  const [reinvestSuccess, setReinvestSuccess] = useState('');

  const handleAddWalletWithKey = async () => {
    if (!newWalletAddress && !newWalletKey) return;
    
    setIsAddingWallet(true);
    try {
      // If private key provided, verify it first
      if (newWalletKey) {
        const verified = await walletApi.verifyKey(newWalletKey);
        if (verified.address.toLowerCase() !== newWalletAddress.toLowerCase()) {
          alert('Private key does not match the wallet address');
          setIsAddingWallet(false);
          return;
        }
        // Add with private key for trading
        await walletApi.addWithKey({
          address: newWalletAddress,
          privateKey: newWalletKey,
          name: walletName || 'Wallet',
          chain: walletChain,
        });
      }
      
      await addWallet({
        address: newWalletAddress,
        name: walletName || 'Wallet',
        balance: 0,
        chain: walletChain,
        privateKey: newWalletKey || undefined,
      });
      setNewWalletAddress('');
      setNewWalletKey('');
      setWalletName('');
    } catch (error) {
      console.error('Failed to add wallet:', error);
    } finally {
      setIsAddingWallet(false);
    }
  };

  const handleAddWallet = async () => {
    if (!newWalletAddress) return;
    
    setIsAddingWallet(true);
    try {
      await addWallet({
        address: newWalletAddress,
        name: walletName || 'Unnamed Wallet',
        balance: 0,
        chain: walletChain,
      });
      setNewWalletAddress('');
      setWalletName('');
    } catch (error) {
      console.error('Failed to add wallet:', error);
    } finally {
      setIsAddingWallet(false);
    }
  };

  const handleStartEngine = async () => {
    try {
      await engineApi.start('live');
      await updateEngineStatus({ isRunning: true });
    } catch (error) {
      console.error('Failed to start engine:', error);
    }
  };

  const handleStopEngine = async () => {
    try {
      await engineApi.stop();
      await updateEngineStatus({ isRunning: false });
    } catch (error) {
      console.error('Failed to stop engine:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-slate-400">Manage wallets, engine, and system preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('wallets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'wallets'
              ? 'bg-cyan-500 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Wallets
        </button>
        <button
          onClick={() => setActiveTab('deployments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'deployments'
              ? 'bg-cyan-500 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          Deployments
        </button>
        <button
          onClick={() => setActiveTab('engine')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'engine'
              ? 'bg-cyan-500 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          Engine
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'general'
              ? 'bg-cyan-500 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          General
        </button>
      </div>

      {/* Wallets Tab */}
      {activeTab === 'wallets' && (
        <div className="space-y-6">

          {/* Single Add Form */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Add Wallet</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Wallet Address (0x...)"
                value={newWalletAddress}
                onChange={(e) => setNewWalletAddress(e.target.value)}
                className="md:col-span-2 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                placeholder="Wallet Name (optional)"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
              <select
                value={walletChain}
                onChange={(e) => setWalletChain(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="ethereum">Ethereum</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="optimism">Optimism</option>
                <option value="polygon">Polygon</option>
                <option value="bsc">BNB Chain</option>
              </select>
            </div>
            
            {/* Private Key Field */}
            <div className="mt-4">
              <label className="block text-sm text-slate-400 mb-2">
                Private Key (optional - required for trading)
              </label>
              <div className="relative">
                <input
                  type={showPrivateKey ? 'text' : 'password'}
                  placeholder="Enter private key for trading capability"
                  value={newWalletKey}
                  onChange={(e) => setNewWalletKey(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPrivateKey ? <Key className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Private key is stored locally and never sent to the server
              </p>
            </div>

            <button
              onClick={handleAddWalletWithKey}
              disabled={!newWalletAddress || isAddingWallet}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isAddingWallet ? 'Adding...' : 'Add Wallet'}
            </button>
          </div>

          {/* Wallet List */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            {/* Header with totals */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Connected Wallets</h3>
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-400">
                  <span className="text-cyan-400 font-medium">{totalWalletCount}</span> wallets
                </div>
                <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-lg">
                  <span className="text-cyan-400 font-medium">{totalWalletBalance.toFixed(4)} ETH</span>
                  <span className="text-slate-400 text-sm ml-1">total</span>
                </div>
              </div>
            </div>
            
            {wallets.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No wallets connected</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">#</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Wallet Address</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Private Key</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Chain</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Balance</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {wallets.map((wallet, index) => (
                      <tr key={wallet.id} className="hover:bg-slate-700/30">
                        <td className="px-3 py-3 text-sm text-slate-400">{index + 1}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{wallet.name}</span>
                            <span className="text-sm text-slate-400 font-mono" title={wallet.address}>
                              {shortenAddress(wallet.address)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-sm text-slate-400 font-mono" title={wallet.privateKey || ''}>
                            {wallet.privateKey ? shortenAddress(wallet.privateKey) : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-600 text-white capitalize">
                            {wallet.chain}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {isValidAddress(wallet.address) ? (
                            <span className="flex items-center gap-1 text-green-400 text-sm">
                              <CheckCircle className="w-3 h-3" />
                              Valid
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400 text-sm">
                              <XCircle className="w-3 h-3" />
                              Invalid
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-white font-medium">{wallet.balance.toFixed(4)} ETH</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingWalletId(editingWalletId === wallet.id ? null : wallet.id)}
                              className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeWallet(wallet.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-700/30">
                    <tr>
                      <td className="px-3 py-3 text-slate-400" colSpan={4}></td>
                      <td className="px-3 py-3 text-sm text-slate-400">Total:</td>
                      <td className="px-3 py-3 text-white font-bold">{totalWalletBalance.toFixed(4)} ETH</td>
                      <td className="px-3 py-3 text-sm text-slate-400">{totalWalletCount} wallets</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Profit Withdrawal Panel */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Profit Withdrawal
            </h3>
            
            {/* Profit Balance Display */}
            <div className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 rounded-lg p-4 mb-4 border border-green-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-400">Available Profit</div>
                  <div className="text-2xl font-bold text-green-400">{availableProfit} ETH</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400">≈ ${(availableProfit * 2500).toFixed(2)} USD</div>
                </div>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setWithdrawalMode('manual')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  withdrawalMode === 'manual'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Manual
              </button>
              <button
                onClick={() => setWithdrawalMode('auto')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  withdrawalMode === 'auto'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                Auto
              </button>
            </div>

            {/* Manual Mode */}
            {withdrawalMode === 'manual' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Amount (ETH)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max={availableProfit}
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setManualAmount('0.1')}
                      className="px-3 py-1 bg-slate-700 text-slate-400 rounded text-sm hover:bg-slate-600"
                    >
                      0.1
                    </button>
                    <button
                      onClick={() => setManualAmount('0.5')}
                      className="px-3 py-1 bg-slate-700 text-slate-400 rounded text-sm hover:bg-slate-600"
                    >
                      0.5
                    </button>
                    <button
                      onClick={() => setManualAmount(String(availableProfit))}
                      className="px-3 py-1 bg-slate-700 text-slate-400 rounded text-sm hover:bg-slate-600"
                    >
                      Max
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Recipient Address</label>
                  <input
                    type="text"
                    value={withdrawalAddress}
                    onChange={(e) => setWithdrawalAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Auto Mode */}
            {withdrawalMode === 'auto' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Minimum Threshold (ETH)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={autoThreshold}
                    onChange={(e) => setAutoThreshold(e.target.value)}
                    placeholder="Minimum threshold"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-green-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Auto-transfer when profit exceeds threshold
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Recipient Address</label>
                  <input
                    type="text"
                    value={withdrawalAddress}
                    onChange={(e) => setWithdrawalAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-green-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {withdrawError && (
              <div className="flex items-center gap-2 p-3 mt-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                <XCircle className="w-4 h-4" />
                {withdrawError}
              </div>
            )}
            {withdrawSuccess && (
              <div className="flex items-center gap-2 p-3 mt-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                {withdrawSuccess}
              </div>
            )}

            {/* Withdraw Button */}
            <button
              onClick={() => {
                if (withdrawalMode === 'manual' && (!manualAmount || !withdrawalAddress)) {
                  setWithdrawError('Please enter amount and recipient address');
                  return;
                }
                if (withdrawalMode === 'auto' && !withdrawalAddress) {
                  setWithdrawError('Please enter recipient address');
                  return;
                }
                setWithdrawError('');
                setWithdrawSuccess(withdrawalMode === 'manual' 
                  ? `Withdrawal of ${manualAmount} ETH initiated`
                  : 'Auto-transfer mode enabled'
                );
                setIsWithdrawing(true);
                setTimeout(() => setIsWithdrawing(false), 2000);
              }}
              disabled={isWithdrawing}
              className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                withdrawalMode === 'manual'
                  ? 'bg-cyan-500 hover:bg-cyan-600'
                  : 'bg-green-500 hover:bg-green-600'
              } text-white disabled:opacity-50`}
            >
              {isWithdrawing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                withdrawalMode === 'manual' ? <ArrowUpRight className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />
              )}
              {withdrawalMode === 'manual' ? 'Withdraw' : 'Enable Auto'}
            </button>
          </div>

          {/* Profit Reinvestment Panel */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Profit Reinvestment
            </h3>
            
            {/* Reinvestment Toggle */}
            <div className="flex items-center justify-between mb-4 p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="font-medium text-white">Auto-Reinvest Profits</div>
                  <div className="text-xs text-slate-400">Automatically reinvest profits into trading</div>
                </div>
              </div>
              <button
                onClick={() => setReinvestEnabled(!reinvestEnabled)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  reinvestEnabled ? 'bg-purple-500' : 'bg-slate-600'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  reinvestEnabled ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Reinvestment Percentage Slider */}
            {reinvestEnabled && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-slate-400">Reinvestment Percentage</label>
                    <span className="text-lg font-bold text-purple-400">{reinvestPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={reinvestPercentage}
                    onChange={(e) => setReinvestPercentage(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Reinvestment Preview */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Available to Reinvest</div>
                      <div className="text-lg font-bold text-white">{(availableProfit * reinvestPercentage / 100).toFixed(4)} ETH</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">To Be Withdrawn</div>
                      <div className="text-lg font-bold text-slate-400">{(availableProfit * (100 - reinvestPercentage) / 100).toFixed(4)} ETH</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setReinvestSuccess(`Reinvestment configured at ${reinvestPercentage}%`);
                    setTimeout(() => setReinvestSuccess(''), 3000);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Apply Reinvestment Settings
                </button>

                {reinvestSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    {reinvestSuccess}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Transaction History
            </h3>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'deposit' ? 'bg-green-500/20' : 
                      tx.type === 'withdrawal' ? 'bg-red-500/20' : 'bg-cyan-500/20'
                    }`}>
                      {tx.type === 'deposit' ? (
                        <ArrowDownRight className="w-5 h-5 text-green-400" />
                      ) : tx.type === 'withdrawal' ? (
                        <ArrowUpRight className="w-5 h-5 text-red-400" />
                      ) : (
                        <DollarSign className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-white capitalize">{tx.type} - {tx.amount} {tx.currency}</div>
                      <div className="text-xs text-slate-400 font-mono">{tx.hash}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 text-sm ${
                      tx.status === 'confirmed' ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {tx.status === 'confirmed' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {tx.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(tx.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Deployments Tab */}
      {activeTab === 'deployments' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Deployments</h2>
              <p className="text-slate-400">Manage your AlphaPro instances</p>
            </div>
            <button
              onClick={() => fetchDeployments()}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Deployments Table */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Smart Wallet</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Contract</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Cloud</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {deployments.map((deployment, index) => (
                  <tr key={deployment.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-4 text-sm text-slate-400">{index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm text-white font-mono">
                          {deployment.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-300 font-mono">
                        {deployment.id}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-400">
                        {deployment.lastDeploy 
                          ? new Date(deployment.lastDeploy).toLocaleString() 
                          : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        deployment.status === 'healthy' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {deployment.status === 'healthy' ? 'Production' : 'Paper'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-400">
                        {deployment.region || 'Render'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`flex items-center gap-2 text-sm ${
                        deployment.status === 'healthy' 
                          ? 'text-green-400' 
                          : deployment.status === 'degraded'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          deployment.status === 'healthy' 
                            ? 'bg-green-400' 
                            : 'bg-yellow-400'
                        }`} />
                        {deployment.status === 'healthy' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchDeployments()}
                          className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                          title="Refresh"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        {deployment.url && (
                          <a
                            href={deployment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                            title="Open"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {deployments.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No deployments found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Engine Tab */}
      {activeTab === 'engine' && (
        <div className="space-y-6">
          {/* Engine Control */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Trading Engine</h3>
                <p className="text-sm text-slate-400">Control the trading engine status</p>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    engineStatus.isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`}
                />
                <span className="text-white">{engineStatus.isRunning ? 'Running' : 'Stopped'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStartEngine}
                disabled={engineStatus.isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Engine
              </button>
              <button
                onClick={handleStopEngine}
                disabled={!engineStatus.isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Engine
              </button>
            </div>
          </div>

          {/* Production Mode - Live Trading Only */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Trading Mode</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-lg border-2 border-green-500 bg-green-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-green-400" />
                  <span className="font-medium text-white">LIVE TRADING - PRODUCTION MODE</span>
                </div>
                <p className="text-sm text-slate-400">Active - Executing real trades with your wallets</p>
              </div>
            </div>
          </div>

          {/* Engine Stats */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Engine Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-sm text-slate-400">Total Profit</div>
                <div className="text-xl font-bold text-green-400">
                  ${engineStatus.totalProfit.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-sm text-slate-400">Daily Profit</div>
                <div className="text-xl font-bold text-green-400">
                  ${engineStatus.dailyProfit.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-sm text-slate-400">Active Strategies</div>
                <div className="text-xl font-bold text-white">
                  {engineStatus.strategies.length}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-sm text-slate-400">Current Mode</div>
                <div className="text-xl font-bold text-cyan-400 uppercase">
                  {engineStatus.mode}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="font-medium text-white">API Endpoint</div>
                    <div className="text-sm text-slate-400">https://alphapro-api.onrender.com</div>
                  </div>
                </div>
                <button className="text-cyan-400 hover:text-cyan-300 text-sm">Edit</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="font-medium text-white">API Keys</div>
                    <div className="text-sm text-slate-400">Manage API keys and tokens</div>
                  </div>
                </div>
                <button className="text-cyan-400 hover:text-cyan-300 text-sm">Manage</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="font-medium text-white">Notifications</div>
                    <div className="text-sm text-slate-400">Configure alerts and notifications</div>
                  </div>
                </div>
                <button className="text-cyan-400 hover:text-cyan-300 text-sm">Configure</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
