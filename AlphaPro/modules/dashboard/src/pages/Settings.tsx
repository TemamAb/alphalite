import { useState } from 'react';
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
  
  // Bulk import state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [detectedWallets, setDetectedWallets] = useState<{ address: string; privateKey?: string }[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // Detect MetaMask wallets
  const detectWallets = async () => {
    setIsDetecting(true);
    setBulkError('');
    setDetectedWallets([]);
    
    try {
      if (!window.ethereum) {
        setBulkError('No Ethereum wallet detected. Please install MetaMask.');
        setIsDetecting(false);
        return;
      }
      
      // Request accounts - this will prompt user to connect
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (accounts && accounts.length > 0) {
        setDetectedWallets(accounts.map(addr => ({ address: addr })));
      } else {
        setBulkError('No accounts found. Please connect your wallet first.');
      }
    } catch (error) {
      setBulkError('Failed to detect wallet: ' + (error as Error).message);
    } finally {
      setIsDetecting(false);
    }
  };

  // Handle adding wallet with private key
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

  // Handle bulk import
  const handleBulkImport = async () => {
    if (!bulkInput.trim()) return;
    
    setIsBulkImporting(true);
    setBulkError('');
    
    try {
      // Parse input - each line: address[,privateKey]
      const lines = bulkInput.trim().split('\n');
      const parsedWallets = lines.map(line => {
        const parts = line.split(',');
        return {
          address: parts[0].trim(),
          privateKey: parts[1]?.trim(),
          name: `Wallet ${parts[0].slice(0, 6)}`,
          chain: walletChain,
        };
      }).filter(w => w.address.startsWith('0x'));
      
      if (parsedWallets.length === 0) {
        setBulkError('No valid wallet addresses found');
        setIsBulkImporting(false);
        return;
      }
      
      // Add detected wallets
      for (const w of parsedWallets) {
        await addWallet({
          address: w.address,
          name: w.name,
          balance: 0,
          chain: w.chain,
          privateKey: w.privateKey,
        });
      }
      
      setBulkInput('');
      setBulkMode(false);
    } catch (error) {
      setBulkError('Failed to import wallets: ' + (error as Error).message);
    } finally {
      setIsBulkImporting(false);
    }
  };

  // Add detected wallet
  const addDetectedWallet = async (wallet: { address: string; privateKey?: string }) => {
    try {
      await addWallet({
        address: wallet.address,
        name: `Detected Wallet`,
        balance: 0,
        chain: walletChain,
        privateKey: wallet.privateKey,
      });
      setDetectedWallets(prev => prev.filter(w => w.address !== wallet.address));
    } catch (error) {
      console.error('Failed to add wallet:', error);
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
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setBulkMode(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                !bulkMode
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Plus className="w-4 h-4" />
              Single Add
            </button>
            <button
              onClick={() => setBulkMode(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                bulkMode
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Upload className="w-4 h-4" />
              Bulk Import
            </button>
            <button
              onClick={detectWallets}
              disabled={isDetecting}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
            >
              {isDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {isDetecting ? 'Detecting...' : 'Detect Wallet'}
            </button>
          </div>

          {/* Detected Wallets */}
          {detectedWallets.length > 0 && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-400" />
                Detected Wallets
              </h3>
              <div className="space-y-2">
                {detectedWallets.map((wallet) => (
                  <div key={wallet.address} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="font-mono text-sm text-white">
                      {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                    </div>
                    <button
                      onClick={() => addDetectedWallet(wallet)}
                      className="flex items-center gap-1 px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bulk Error */}
          {bulkError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              <AlertCircle className="w-4 h-4" />
              {bulkError}
            </div>
          )}

          {/* Single Add Form */}
          {!bulkMode && (
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
          )}

          {/* Bulk Import Form */}
          {bulkMode && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Bulk Import Wallets</h3>
              <p className="text-sm text-slate-400 mb-4">
                Enter one wallet address per line. Optionally, add a comma and private key for trading capability.
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Format: address or address,privateKey (one per line)
              </p>
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder={`0x1234567890abcdef1234567890abcdef12345678,0xabcdef1234567890abcdef1234567890abcdef1234\n0xanotheraddress...`}
                rows={6}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono text-sm"
              />
              <button
                onClick={handleBulkImport}
                disabled={!bulkInput.trim() || isBulkImporting}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isBulkImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isBulkImporting ? 'Importing...' : 'Import Wallets'}
              </button>
            </div>
          )}

          {/* Wallet List */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Connected Wallets</h3>
            {wallets.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No wallets connected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{wallet.name}</div>
                        <div className="text-sm text-slate-400 font-mono">
                          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-white font-medium">{wallet.balance.toFixed(4)} ETH</div>
                        <div className="text-sm text-slate-400 capitalize">{wallet.chain}</div>
                      </div>
                      <button
                        onClick={() => removeWallet(wallet.id)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
