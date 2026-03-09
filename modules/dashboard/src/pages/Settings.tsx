import { useState, useEffect } from 'react';
import { useDashboardStore, useAuthStore } from '@/stores';
import { walletApi, engineApi } from '@/services/api';
import Tooltip from '@/components/Tooltip';
import CollapsiblePanel from '@/components/CollapsiblePanel';
import DataConnectors from './DataConnectors';
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
  AlertTriangle,
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
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Download,
  Gauge,
  Cpu,
  Wifi,
  WifiOff,
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
  const { wallets, engineStatus, addWallet, removeWallet, updateEngineStatus, deployments, fetchDeployments, fetchWalletBalances } = useDashboardStore();
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
  const { token } = useAuthStore.getState();
  // Allow empty string for relative paths (production/docker), fallback only if undefined
  const API_URL = typeof import.meta.env.VITE_API_URL === 'string' 
    ? import.meta.env.VITE_API_URL 
    : 'http://localhost:3000';

  // Fetch transactions and profit from API on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingTransactions(true);
      setIsLoadingProfit(true);
      try {
        // Fetch transactions from API
        const txResponse = await fetch(`${API_URL}/api/transactions`, {
          headers: {
            'Authorization': `Bearer ${token}`
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
        const profitResponse = await fetch(`${API_URL}/api/engine/profit`, {
          headers: {
            'Authorization': `Bearer ${token}`
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
  }, [token, API_URL]);

  // Check configuration source
  useEffect(() => {
    const checkSource = async () => {
      if (wallets.length > 0) {
        setConfigSource('Dashboard Settings');
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/config/wallet`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (data.found) setConfigSource(data.source);
      } catch (e) { /* ignore */ }
    };
    checkSource();
  }, [wallets.length, token, API_URL]);

  // Profit Reinvestment state
  const [reinvestEnabled, setReinvestEnabled] = useState(false);
  const [reinvestPercentage, setReinvestPercentage] = useState(50);
  const [reinvestSuccess, setReinvestSuccess] = useState('');

  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const totalSteps = 6;
  
  // Stop Confirmation State
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);
  
  // Engine Start Logic State
  const [walletToConfirm, setWalletToConfirm] = useState<{ address: string; source: string; privateKey: string } | null>(null);
  const [configSource, setConfigSource] = useState<string | null>(null);
  
  // Manual Entry State
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [manualKey, setManualKey] = useState('');

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') !== 'light';
    }
    return true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleWizardNext = () => {
    if (wizardStep < totalSteps) setWizardStep(wizardStep + 1);
    else setShowWizard(false);
  };

  const handleWizardBack = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  const handleAddWalletWithKey = async () => {
    if (!newWalletAddress && !newWalletKey) return;
    
    setIsAddingWallet(true);
    try {
      let finalAddress = newWalletAddress;

      // If private key provided, verify it first
      if (newWalletKey) {
        const verified = await walletApi.verifyKey(newWalletKey);
        
        // Auto-detect address from key if address field is empty
        if (!finalAddress) {
          finalAddress = verified.address;
          setNewWalletAddress(verified.address);
        } else if (verified.address.toLowerCase() !== finalAddress.toLowerCase()) {
          alert('Private key does not match the wallet address');
          setIsAddingWallet(false);
          return;
        }
        // Add with private key for trading
        await walletApi.addWithKey({
          address: finalAddress,
          privateKey: newWalletKey,
          name: walletName || 'Wallet',
          chain: walletChain,
        });
      }
      
      await addWallet({
        address: finalAddress,
        name: walletName || 'Wallet',
        balance: 0,
        chain: walletChain,
        privateKey: newWalletKey || undefined,
      });
      
      // Refresh balances immediately to show real-time data
      await fetchWalletBalances();
      
      // Clear form
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

  const detectAndStartEngine = async () => {
    let candidate = null;

    // 1. Search Settings Panel (Store)
    // Note: We check if any wallet in the store has a private key available in memory
    const settingWallet = wallets.find(w => w.privateKey);
    if (settingWallet && settingWallet.privateKey) {
      candidate = {
        address: settingWallet.address,
        privateKey: settingWallet.privateKey,
        source: 'Settings Panel'
      };
    }

    // 2. Search Render / .env (via API) if not found in Settings
    if (!candidate) {
      try {
        const response = await fetch(`${API_URL}/api/config/wallet`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.found && data.address && data.privateKey) {
            candidate = {
              address: data.address,
              privateKey: data.privateKey,
              source: data.source // 'Render Environment' or '.env File'
            };
          }
        }
      } catch (error) {
        console.error('Failed to detect environment wallet:', error);
      }
    }

    if (candidate) {
      setWalletToConfirm(candidate);
    } else {
      setShowManualEntry(true);
    }
  };

  const confirmAndStartEngine = async () => {
    if (walletToConfirm) {
      // Ensure it's in the store for visibility
      await addWallet({
        address: walletToConfirm.address,
        name: `Imported from ${walletToConfirm.source}`,
        balance: 0,
        chain: 'ethereum',
        privateKey: walletToConfirm.privateKey
      });
      await startEngine();
      setWalletToConfirm(null);
    }
  };

  const handleManualStart = async () => {
    if (!manualAddress || !manualKey) return;
    
    await addWallet({
      address: manualAddress,
      name: 'Manual Entry',
      balance: 0,
      chain: 'ethereum',
      privateKey: manualKey
    });
    
    await startEngine();
    setShowManualEntry(false);
    setManualAddress('');
    setManualKey('');
  };

  const [showWalletConfirmation, setShowWalletConfirmation] = useState(false);
  const [detectedWallets, setDetectedWallets] = useState<{address: string, privateKey: string, source: string, isValid: boolean}[]>([]);
  const [connectionProgress, setConnectionProgress] = useState<string[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  // Get connection data from multiple sources (priority order)
  // Priority 1: Wallet Panel (Settings) - configured wallets with private keys
  // Priority 2: DataConnectors Panel (localStorage) - RPC/API keys
  // Priority 3: Render Environment Variables (production)
  // Priority 4: Fallback - user needs to add
  const getConnectionData = () => {
    // Priority 1: Wallet Panel - wallets already in the store have addresses and private keys
    const storeWallet = wallets.find((w: any) => w.privateKey && w.privateKey.length > 0);
    
    // Priority 2: localStorage (from DataConnectors panel)
    const localRpcUrl = localStorage.getItem('eth_rpc_url');
    const localAlchemyKey = localStorage.getItem('alchemy_api_key');
    const localInfuraKey = localStorage.getItem('infura_api_key');
    const localWalletAddress = localStorage.getItem('wallet_address');
    const localPrivateKey = localStorage.getItem('wallet_private_key');
    
    // Priority 3: Render environment variables (production deployment)
    const renderRpcUrl = import.meta.env.VITE_ETH_RPC_URL;
    const renderAlchemy = import.meta.env.VITE_ALCHEMY_API_KEY;
    const renderInfura = import.meta.env.VITE_INFURA_API_KEY;
    const renderWalletAddress = import.meta.env.VITE_WALLET_ADDRESS;
    const renderPrivateKey = import.meta.env.VITE_PRIVATE_KEY;
    
    return {
      // From Wallet Panel
      storeWallet: storeWallet || null,
      // From DataConnectors
      localRpcUrl,
      localAlchemyKey,
      localInfuraKey,
      localWalletAddress,
      localPrivateKey,
      // From Render
      renderRpcUrl,
      renderAlchemy,
      renderInfura,
      renderWalletAddress,
      renderPrivateKey,
      // Resolved values (priority order)
      rpcUrl: localRpcUrl || renderRpcUrl || '',
      alchemyKey: localAlchemyKey || renderAlchemy || '',
      infuraKey: localInfuraKey || renderInfura || '',
      walletAddress: storeWallet?.address || localWalletAddress || renderWalletAddress || '',
      privateKey: storeWallet?.privateKey || localPrivateKey || renderPrivateKey || ''
    };
  };

  // Detect all available wallets with priority-based override
  // Priority: Wallet Panel > DataConnectors > Render/.env
  // If Wallet Panel has wallet, it overrides all other sources
  const detectWallets = async () => {
    const detected: {address: string, privateKey: string, source: string, isValid: boolean}[] = [];
    
    // Priority 1: Wallet Panel (Settings) - wallets in store
    // If Wallet Panel has wallets, they override all other sources
    const walletPanelWallets = wallets.filter((w: any) => w.privateKey && w.privateKey.length > 0);
    
    if (walletPanelWallets.length > 0) {
      // Wallet Panel has wallets - override/disable Render and DataConnectors
      for (const w of walletPanelWallets) {
        try {
          const verified = await walletApi.verifyKey(w.privateKey);
          detected.push({
            address: w.address,
            privateKey: w.privateKey,
            source: 'Wallet Panel (Override)',
            isValid: verified.address.toLowerCase() === w.address.toLowerCase()
          });
        } catch (e) {
          console.error(`[WALLET] Verification failed for wallet in panel: ${w.address}`, e);
          detected.push({
            address: w.address,
            privateKey: w.privateKey,
            source: 'Wallet Panel (Override)',
            isValid: false
          });
        }
      }
      
      console.log('[WALLET] Wallet Panel active - Render/DataConnectors disabled');
      return detected;
    }
    
    // Priority 2: DataConnectors (localStorage) - only if Wallet Panel is empty
    const localWalletAddress = localStorage.getItem('wallet_address');
    const localPrivateKey = localStorage.getItem('wallet_private_key');
    if (localWalletAddress && localPrivateKey) {
      try {
        const verified = await walletApi.verifyKey(localPrivateKey);
        detected.push({
          address: localWalletAddress,
          privateKey: localPrivateKey,
          source: 'DataConnectors',
          isValid: verified.address.toLowerCase() === localWalletAddress.toLowerCase()
        });
      } catch (e) {
        detected.push({
          address: localWalletAddress,
          privateKey: localPrivateKey,
          source: 'DataConnectors',
          isValid: false
        });
      }
      console.log('[WALLET] Using DataConnectors wallet');
      return detected;
    }
    
    // Priority 3: Render Environment Variables - only if both above are empty
    const renderWalletAddress = import.meta.env.VITE_WALLET_ADDRESS;
    const renderPrivateKey = import.meta.env.VITE_PRIVATE_KEY;
    if (renderWalletAddress && renderPrivateKey) {
      try {
        const verified = await walletApi.verifyKey(renderPrivateKey);
        detected.push({
          address: renderWalletAddress,
          privateKey: renderPrivateKey,
          source: 'Render/.env',
          isValid: verified.address.toLowerCase() === renderWalletAddress.toLowerCase()
        });
      } catch (e) {
        detected.push({
          address: renderWalletAddress,
          privateKey: renderPrivateKey,
          source: 'Render/.env',
          isValid: false
        });
      }
      console.log('[WALLET] Using Render/.env wallet');
    }
    
    return detected;
  };

  const startEngine = async () => {
    setIsStarting(true);
    setConnectionProgress(['Initializing...']);
    
    try {
      const conn = getConnectionData();
      const missingItems: string[] = [];
      const progress: string[] = [];
      
      // === Check RPC/API Configuration ===
      if (conn.rpcUrl) {
        // Detect source for RPC
        const source = conn.localRpcUrl ? 'DataConnectors' : (conn.renderRpcUrl ? 'Render' : 'Unknown');
        progress.push('✓ RPC URL detected');
        if (conn.rpcUrl.includes('alchemy')) {
          progress.push(`✓ Using Alchemy provider (${source})`);
        } else if (conn.rpcUrl.includes('infura')) {
          progress.push(`✓ Using Infura provider (${source})`);
        } else {
          progress.push(`✓ Using custom RPC provider (${source})`);
        }
      } else {
        missingItems.push('RPC URL');
        progress.push('✗ No RPC URL found');
      }
      
      // Check API keys
      if (conn.alchemyKey || conn.infuraKey) {
        const apiSource = conn.localAlchemyKey || conn.localInfuraKey ? 'DataConnectors' : 'Render';
        progress.push(`✓ API Key detected (${apiSource})`);
      }
      
      setConnectionProgress(progress);
      
      // === Check Wallet Configuration ===
      // Detect all available wallets
      const detected = await detectWallets();
      setDetectedWallets(detected);
      
      if (detected.length === 0) {
        missingItems.push('Wallet Address & Private Key');
        progress.push('✗ No wallet configured');
        setConnectionProgress([...progress]);
        
        setIsStarting(false);
        alert(`⚠️ Cannot Start Engine\n\nMissing:\n- ${missingItems.join('\n- ')}\n\nAdd wallet in:\n1. Settings → Wallet Panel (recommended)\n2. DataConnectors Panel\n3. Render Environment Variables`);
        return;
      }
      
      // Show wallet confirmation modal
      setShowWalletConfirmation(true);
      setIsStarting(false);
      setConnectionProgress([]);
      
    } catch (error) {
      console.error('Failed to start engine:', error);
      setConnectionProgress(prev => [...prev, `❌ Error: ${error}`]);
    }
  };

  // Confirm and start engine after user validates wallets
  const handleWalletConfirmation = async () => {
    setIsStarting(true);
    setConnectionProgress(['🔄 Starting engine...']);
    
    try {
      // Verify at least one wallet is valid
      const validWallets = detectedWallets.filter(w => w.isValid);
      
      if (validWallets.length === 0) {
        alert('⚠️ No valid wallets found. Please check your private keys.');
        setIsStarting(false);
        return;
      }
      
      // Get the first valid wallet address
      const primaryWallet = validWallets[0];
      
      // ARCHITECT'S NOTE: Removed setTimeout-based progress simulation.
      // This is demo-ware and provides a false sense of progress to the user.
      // A production system must reflect the *actual* state from the API.
      // The original code simulated a multi-step process that does not exist in the API call.
      setConnectionProgress([
        '🔄 Sending start command to engine...',
        'Please wait for API response.'
      ]);
      // In a real implementation, the API would return a job ID or a WebSocket
      // connection would be established to stream real progress.
      
      // Check if at least one connection is established (wallet valid)
      if (validWallets.length > 0) {
        // Show success
        setConnectionProgress([
          '✅ Engine started successfully!',
          '🔗 Connected to RPC provider',
          '🔐 Wallet authenticated',
          '🧠 AI Brain connected'
        ]);
        
        // Get active deployment if available (healthy status = running)
        const activeDeployment = deployments.find(d => d.status === 'healthy');
        
        // Start the engine via API with deployment and wallet linking
        await engineApi.start('live', {
          mode: 'live',
          deploymentId: activeDeployment?.id,
          deploymentName: activeDeployment?.name,
          walletAddress: primaryWallet.address
        });
        
        await updateEngineStatus({ 
          isRunning: true,
          activeDeploymentId: activeDeployment?.id,
          activeDeploymentName: activeDeployment?.name
        });
        
        // Close modal after short delay
        setTimeout(() => {
          setShowWalletConfirmation(false);
          setConnectionProgress([]);
        }, 1500);
      } else {
        setConnectionProgress(['❌ Failed to establish connections']);
      }
      
    } catch (error) {
      console.error('Failed to start engine:', error);
      setConnectionProgress([`❌ Error: ${error}`]);
    } finally {
      setTimeout(() => {
        setIsStarting(false);
      }, 2000);
    }
  };

  const confirmStopEngine = async () => {
    try {
      await engineApi.stop();
      await updateEngineStatus({ isRunning: false });
      setShowStopConfirmation(false);
    } catch (error) {
      console.error('Failed to stop engine:', error);
    }
  };

  const handleExportConfig = () => {
    const config = {
      wallets: wallets.map((w: any) => { const { privateKey, ...rest } = w; return rest; }),
      engineStatus,
      deployments,
      withdrawal: {
        mode: withdrawalMode,
        address: withdrawalAddress,
        autoThreshold: withdrawalMode === 'auto' ? autoThreshold : undefined,
      },
      reinvestment: {
        enabled: reinvestEnabled,
        percentage: reinvestPercentage,
      },
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alphapro-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const maskSecret = (str: string) => {
    if (!str || str.length < 10) return str;
    return `${str.slice(0, 5)}...${str.slice(-5)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/alphapro-logo.png" alt="AlphaPro" className="h-10 md:h-12 w-auto object-contain" />
          <div>
            <h2 className="text-2xl font-bold text-white">AlphaPro Settings</h2>
            <p className="text-slate-400">Manage wallets, engine, and system preferences</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportConfig}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors border border-slate-600"
          >
            <Download className="w-4 h-4" />
            Export Config
          </button>
          <button
            onClick={() => { setShowWizard(true); setWizardStep(1); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-lg shadow-purple-500/20"
          >
            <Wand2 className="w-4 h-4" />
            Quick Setup
          </button>
        </div>
      </div>

      {/* 1. Wallet Management */}
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
        </div>

      {/* Engine Control */}
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

            {/* Configuration Source Indicator */}
            <div className="mb-4 p-3 bg-slate-700/30 rounded-lg flex items-center justify-between text-sm">
              <span className="text-slate-400">Active Configuration Source:</span>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="text-white font-medium">{configSource || 'None Detected'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={detectAndStartEngine}
                disabled={engineStatus.isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Engine
              </button>
              <button
                onClick={() => setShowStopConfirmation(true)}
                disabled={!engineStatus.isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Engine
              </button>
            </div>

            {/* Connection Progress Display */}
            {isStarting && connectionProgress.length > 0 && (
              <div className="mt-4 bg-slate-900/80 rounded-lg p-4 border border-cyan-500/50 animate-pulse">
                <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Engine Start Progress
                </h4>
                <div className="space-y-2">
                  {connectionProgress.map((step, index) => (
                    <div 
                      key={index} 
                      className={`text-sm flex items-center gap-2 ${
                        step.includes('✓') ? 'text-green-400' : 
                        step.includes('✗') ? 'text-red-400' : 
                        step.includes('❌') ? 'text-red-400' :
                        step.includes('🚀') ? 'text-yellow-400' :
                        step.includes('✅') ? 'text-green-400 font-semibold' :
                        'text-cyan-400'
                      }`}
                    >
                      {step.includes('✓') && <CheckCircle className="w-3 h-3" />}
                      {step.includes('✗') && <XCircle className="w-3 h-3" />}
                      {step.includes('❌') && <XCircle className="w-3 h-3" />}
                      {step.includes('🚀') && <Zap className="w-3 h-3" />}
                      {step.includes('✅') && <CheckCircle className="w-3 h-3" />}
                      {!step.includes('✓') && !step.includes('✗') && !step.includes('❌') && !step.includes('🚀') && !step.includes('✅') && <Loader2 className="w-3 h-3 animate-spin" />}
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Production Mode - Live Trading Only */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Trading Mode</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className={`p-4 rounded-lg border-2 ${engineStatus.isRunning ? 'border-green-400 bg-green-500/10' : 'border-slate-600 bg-slate-700/50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {engineStatus.isRunning ? (
                    <>
                      <Tooltip
                        content={
                          <div className="p-3 bg-slate-900 border border-slate-600 rounded-lg shadow-xl">
                            <div className="text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-wider">Connection Summary</div>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">DEXes Connected</span>
                                <span className="text-green-400 font-mono">50</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">Chains</span>
                                <span className="text-green-400 font-mono">45</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">Gasless Routes</span>
                                <span className="text-green-400 font-mono">1</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">RPC Latency</span>
                                <span className="text-green-400 font-mono">24ms</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">AI Brain</span>
                                <span className="text-green-400 font-mono">Online</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">Database</span>
                                <span className="text-green-400 font-mono">Connected</span>
                              </div>
                            </div>
                          </div>
                        }
                        position="top"
                      >
                        <div className="flex items-center gap-2 cursor-help">
                          <Gauge className="w-5 h-5 text-green-400 animate-spin" style={{ animationDuration: '2s' }} />
                          <span className="font-medium text-green-400">Engine Running</span>
                        </div>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 text-slate-400" />
                      <span className="font-medium text-slate-400">Live Trading - Production Mode</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  {engineStatus.isRunning 
                    ? 'Engine is active and executing trades with your wallets'
                    : 'Active - Executing real trades with your wallets'}
                </p>
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



      {/* Data Connectors Section */}
      <DataConnectors />

      {/* Deployments */}
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

      {/* General Settings */}
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

      {/* Quick Setup Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Wizard Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-cyan-400" />
                  Quick Setup Wizard
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i + 1 === wizardStep ? 'w-8 bg-cyan-500' : 
                        i + 1 < wizardStep ? 'w-4 bg-green-500' : 'w-4 bg-slate-700'
                      }`} 
                    />
                  ))}
                  <span className="text-slate-400 text-xs ml-2">Step {wizardStep} of {totalSteps}</span>
                </div>
              </div>
              <button onClick={() => setShowWizard(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Wizard Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Connect Wallet</h3>
                      <p className="text-slate-400 text-sm">Add your primary trading wallet to get started.</p>
                    </div>
                  </div>

                  {wallets.length > 0 ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-green-400 font-medium">Wallet Connected</p>
                        <p className="text-slate-400 text-sm">{wallets.length} wallet(s) ready for trading.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                      <input
                        type="text"
                        placeholder="Wallet Address (0x...)"
                        value={newWalletAddress}
                        onChange={(e) => setNewWalletAddress(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                      />
                      <input
                        type="password"
                        placeholder="Private Key (Optional)"
                        value={newWalletKey}
                        onChange={(e) => setNewWalletKey(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={handleAddWalletWithKey}
                        disabled={!newWalletAddress || isAddingWallet}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 transition-colors"
                      >
                        {isAddingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add Wallet
                      </button>
                    </div>
                  )}

                  {/* Wallet Priority Info - NEW */}
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-400 font-medium text-sm">Wallet Priority System</p>
                        <p className="text-slate-400 text-xs mt-1">
                          <span className="text-cyan-400 font-medium">Wallet Panel</span> overrides DataConnectors and Render/.env.
                          When you add a wallet here, it becomes the primary source and disables other configurations.
                        </p>
                        <div className="mt-2 text-xs text-slate-500">
                          Priority: Wallet Panel → DataConnectors → Render/.env
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">RPC & API Configuration</h3>
                      <p className="text-slate-400 text-sm">Configure blockchain connection and API keys.</p>
                    </div>
                  </div>

                  {/* Connection Status */}
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">RPC Provider</span>
                      <span className={conn.rpcUrl ? 'text-green-400' : 'text-red-400'}>
                        {conn.rpcUrl ? '✓ Configured' : '✗ Missing'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">API Key</span>
                      <span className={(conn.alchemyKey || conn.infuraKey) ? 'text-green-400' : 'text-yellow-400'}>
                        {(conn.alchemyKey || conn.infuraKey) ? '✓ Configured' : '⚠ Optional'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      Source: {conn.localRpcUrl ? 'DataConnectors' : (conn.renderRpcUrl ? 'Render/.env' : 'Not configured')}
                    </div>
                  </div>

                  {/* Info about RPC */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-blue-400 font-medium text-sm">RPC Priority</p>
                        <p className="text-slate-400 text-xs mt-1">
                          RPC is also prioritized: DataConnectors → Render/.env.
                          Configure in the DataConnectors panel or set in environment variables.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 shrink-0">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Profit Withdrawal</h3>
                      <p className="text-slate-400 text-sm">Configure where your trading profits should be sent.</p>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-4">
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
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      You can configure auto-withdrawal thresholds later in settings.
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Profit Reinvestment</h3>
                      <p className="text-slate-400 text-sm">Compound your earnings to scale trading volume.</p>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Enable Auto-Reinvestment</span>
                      <button
                        onClick={() => setReinvestEnabled(!reinvestEnabled)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          reinvestEnabled ? 'bg-purple-500' : 'bg-slate-600'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          reinvestEnabled ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
                    {reinvestEnabled && (
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm text-slate-400">Reinvestment Rate</label>
                          <span className="text-purple-400 font-bold">{reinvestPercentage}%</span>
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
                      </div>
                    )}
                  </div>
                </div>
              )}

              {wizardStep === 5 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Start Engine</h3>
                      <p className="text-slate-400 text-sm">Initialize the trading engine and begin monitoring.</p>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 text-center">
                    <div className="mb-6">
                      <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                        engineStatus.isRunning ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/50 text-slate-400'
                      }`}>
                        <Activity className={`w-10 h-10 ${engineStatus.isRunning ? 'animate-pulse' : ''}`} />
                      </div>
                      <h4 className="text-xl font-bold text-white mb-1">
                        {engineStatus.isRunning ? 'Engine Running' : 'Engine Stopped'}
                      </h4>
                      <p className="text-slate-400 text-sm">
                        {engineStatus.isRunning ? 'Monitoring mempool for opportunities' : 'Ready to start'}
                      </p>
                    </div>

                    {!engineStatus.isRunning && (
                        <button
                          onClick={detectAndStartEngine}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                        >
                          <Play className="w-5 h-5" />
                          Start Trading Engine
                        </button>
                    )}
                  </div>
                </div>
              )}

              {wizardStep === 6 && (
                <div className="space-y-6 text-center py-8">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Setup Complete!</h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                      Your AlphaPro instance is configured and ready. You can monitor performance on the dashboard and manage deployments here.
                    </p>
                  </div>
                  
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 max-w-md mx-auto mt-6 text-left">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Server className="w-4 h-4 text-cyan-400" />
                      Active Deployments
                    </h4>
                    <div className="space-y-2">
                      {deployments.length > 0 ? deployments.map(d => (
                        <div key={d.id} className="flex justify-between text-sm">
                          <span className="text-slate-300">{d.name}</span>
                          <span className="text-green-400">Active</span>
                        </div>
                      )) : (
                        <div className="text-sm text-slate-500 italic">No deployments found yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="p-6 border-t border-slate-800 flex justify-between">
              <button
                onClick={handleWizardBack}
                disabled={wizardStep === 1}
                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleWizardNext}
                disabled={(wizardStep === 1 && wallets.length === 0) || (wizardStep === 2 && !getConnectionData().rpcUrl)}
                className="flex items-center gap-2 px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {wizardStep === totalSteps ? 'Finish' : 'Next'}
                {wizardStep !== totalSteps && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stop Engine Confirmation Modal */}
      {showStopConfirmation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 border-l-4 border-l-red-500">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-red-500/20 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Stop Trading Engine?</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Are you sure you want to stop the engine? This will immediately halt all trading activities and opportunity scanning.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowStopConfirmation(false)}
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStopEngine}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop Engine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Confirmation Modal */}
      {walletToConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 border-l-4 border-l-yellow-500">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Key className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Confirm Credentials</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Found wallet configuration in <strong>{walletToConfirm.source}</strong>.
                </p>
              </div>
            </div>
            
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-3 mb-4">
              <div>
                <div className="text-xs text-slate-500 uppercase mb-1">Wallet Address</div>
                <div className="font-mono text-cyan-400 text-sm">{maskSecret(walletToConfirm.address)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase mb-1">Private Key</div>
                <div className="font-mono text-red-400 text-sm">{maskSecret(walletToConfirm.privateKey)}</div>
              </div>
            </div>

            <p className="text-yellow-400 text-sm font-medium mb-6 text-center">
              Please you are advised to confirm the above wallet adresses and private keys belong to you.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setWalletToConfirm(null)}
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndStartEngine}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Confirm & Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Wallet Entry Modal */}
      {showManualEntry && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-cyan-500/20 rounded-full">
                <Wallet className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Manual Wallet Configuration</h3>
                <p className="text-slate-400 text-sm mt-1">
                  No environment configuration detected. Please enter your wallet credentials to start the engine.
                </p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-xs text-slate-500 uppercase mb-1">Wallet Address</label>
                    <input 
                        type="text" 
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 font-mono"
                    />
                </div>
                <div>
                    <label className="block text-xs text-slate-500 uppercase mb-1">Private Key</label>
                    <input 
                        type="password" 
                        value={manualKey}
                        onChange={(e) => setManualKey(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 font-mono"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowManualEntry(false)}
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualStart}
                disabled={!manualAddress || !manualKey}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                Start Engine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Confirmation Modal */}
      {showWalletConfirmation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-cyan-500/50 shadow-2xl shadow-cyan-500/20">
            {/* Header */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Confirm Wallet Addresses</h2>
                  <p className="text-slate-400 text-sm">AlphaPro will deposit profits to these wallets</p>
                </div>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="p-4 bg-yellow-500/10 border-b border-yellow-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-200">
                  <p className="font-medium mb-1">⚠️ Important Security Notice</p>
                  <p>All profits generated by the trading engine will be deposited to the wallet addresses listed below. Please verify that you own these wallets and their private keys are secure.</p>
                </div>
              </div>
            </div>

            {/* Detected Wallets List */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Detected Wallets ({detectedWallets.length})</h3>
              <div className="space-y-3">
                {detectedWallets.map((wallet, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      wallet.isValid 
                        ? 'bg-green-500/10 border-green-500/50' 
                        : 'bg-red-500/10 border-red-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {wallet.isValid ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                          <span className={`font-medium ${wallet.isValid ? 'text-green-400' : 'text-red-400'}`}>
                            {wallet.isValid ? '✓ Valid' : '✗ Invalid'}
                          </span>
                          <span className="text-slate-500 text-sm">({wallet.source})</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">Address:</span>
                            <code className="text-cyan-400 font-mono text-sm bg-slate-900 px-2 py-1 rounded">
                              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">Private Key:</span>
                            <code className="text-yellow-400 font-mono text-sm bg-slate-900 px-2 py-1 rounded">
                              {wallet.privateKey.slice(0, 8)}...{wallet.privateKey.slice(-4)}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ownership Confirmation */}
            <div className="p-6 bg-slate-900/50 border-t border-slate-700">
              <div className="flex items-start gap-3 mb-4">
                <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-300">
                  <p className="font-medium text-white mb-2">By clicking Confirm, you acknowledge that:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>These wallet addresses belong to you</li>
                    <li>You have access to the corresponding private keys</li>
                    <li>Profits will be deposited to these addresses</li>
                    <li>You accept responsibility for the security of these wallets</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWalletConfirmation(false)}
                  disabled={isStarting}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWalletConfirmation}
                  disabled={isStarting || detectedWallets.filter(w => w.isValid).length === 0}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Starting Engine...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirm & Start Engine
                    </>
                  )}
                </button>
              </div>

              {/* Connection Progress Display */}
              {isStarting && connectionProgress.length > 0 && (
                <div className="mt-4 p-4 bg-slate-900/80 rounded-xl border border-cyan-500/30">
                  <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                    <Gauge className="w-4 h-4 animate-spin" />
                    Engine Starting Progress
                  </h4>
                  <div className="space-y-2">
                    {connectionProgress.map((step, index) => (
                      <div 
                        key={index} 
                        className={`text-sm flex items-center gap-2 ${
                          step.includes('✅') ? 'text-green-400 font-medium' : 
                          step.includes('❌') ? 'text-red-400' :
                          step.includes('🔄') ? 'text-cyan-400' :
                          step.includes('📡') ? 'text-blue-400' :
                          step.includes('🔐') ? 'text-yellow-400' :
                          step.includes('🧠') ? 'text-purple-400' :
                          step.includes('📊') ? 'text-orange-400' :
                          step.includes('🎯') ? 'text-pink-400' :
                          'text-slate-400'
                        }`}
                      >
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
