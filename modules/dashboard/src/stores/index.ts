import { create } from 'zustand';

// ==================== Auth Store ====================
interface AuthState {
  isAuthenticated: boolean;
  user: null | { id: string; email: string };
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Login system REMOVED - always authenticated
  isAuthenticated: true,
  user: { id: '1', email: 'admin@alphapro.io' },
  token: 'mock-token-not-used',
  
  checkAuth: async () => {
    // Always authenticated - no login system
    set({ isAuthenticated: true, user: { id: '1', email: 'admin@alphapro.io' } });
  },
  
  login: async (email: string, password: string) => {
    // No-op - login system removed
    set({ isAuthenticated: true, user: { id: '1', email } });
  },
  
  logout: () => {
    // No-op - login system removed, stay authenticated
    set({ isAuthenticated: true, user: { id: '1', email: 'admin@alphapro.io' } });
  },
}));

// ==================== Dashboard Store ====================
interface Deployment {
  id: string;
  name: string;
  status: string;
  lastDeployed: string;
}

interface Wallet {
  address: string;
  balance: string;
  chain: string;
}

interface DashboardStats {
  totalPnl: number;
  activeStrategies: number;
  dailyVolume: number;
  winRate: number;
  totalRequests: number;
  avgLatency: number;
  healthyDeployments: number;
  totalDeployments: number;
  uptime: number;
}

interface EngineStatus {
  isRunning: boolean;
  mode: string;
  totalProfit?: number;
  totalTrades?: number;
}

interface DashboardState {
  stats: DashboardStats;
  deployments: Deployment[];
  wallets: Wallet[];
  refreshInterval: number;
  engineStatus: EngineStatus;
  isLoading: boolean;
  fetchStats: () => Promise<void>;
  fetchDeployments: () => Promise<void>;
  fetchWalletBalances: () => Promise<void>;
  setRefreshInterval: (interval: number) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: {
    totalPnl: 0,
    activeStrategies: 0,
    dailyVolume: 0,
    winRate: 0,
    totalRequests: 0,
    avgLatency: 0,
    healthyDeployments: 1,
    totalDeployments: 1,
    uptime: 100,
  },
  deployments: [],
  wallets: [],
  refreshInterval: 5000,
  engineStatus: { isRunning: false, mode: 'idle', totalProfit: 0, totalTrades: 0 },
  isLoading: false,
  
  fetchStats: async () => {
    // Mock data - replace with actual API calls
    set({
      stats: {
        totalPnl: 12500,
        activeStrategies: 5,
        dailyVolume: 250000,
        winRate: 72,
        totalRequests: 1250,
        avgLatency: 45,
        healthyDeployments: 1,
        totalDeployments: 1,
        uptime: 99.9,
      },
    });
  },
  
  fetchDeployments: async () => {
    // Mock data
    set({
      deployments: [
        { id: '1', name: 'Mainnet Alpha', status: 'active', lastDeployed: new Date().toISOString() },
      ],
    });
  },
  
  fetchWalletBalances: async () => {
    // Mock data
    set({
      wallets: [
        { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f', balance: '2.5', chain: 'Ethereum' },
      ],
    });
  },
  
  setRefreshInterval: (interval: number) => {
    set({ refreshInterval: interval });
  },
}));

// ==================== System Store ====================
interface SystemState {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  uptime: number;
  connect: () => void;
  fetchSystemMetrics: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  cpuUsage: 0,
  memoryUsage: 0,
  networkLatency: 0,
  uptime: 0,
  
  connect: () => {
    console.log('[SYSTEM] Analytics link established');
  },
  
  fetchSystemMetrics: async () => {
    // Mock data
    set({
      cpuUsage: 45,
      memoryUsage: 62,
      networkLatency: 25,
      uptime: Date.now(),
    });
  },
}));
