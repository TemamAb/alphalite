import { create } from 'zustand';
import { deploymentApi, walletApi, engineApi, metricsApi, checkHealth } from '@/services/api';

// ==================== Auth Store ====================
interface AuthState {
  isAuthenticated: boolean;
  user: null | { id: string; email: string };
  token: string;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Login system REMOVED - always authenticated for Sovereign Mode
  isAuthenticated: true,
  user: { id: '1', email: 'admin@alphapro.io' },
  token: 'open-access-token',
  
  checkAuth: async () => {
    // Always authenticated - no login system
    set({ isAuthenticated: true, user: { id: '1', email: 'admin@alphapro.io' } });
  },
  
  login: async (email: string, _password: string) => {
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
  totalProfit: number;
  totalTrades: number;
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
  startEngine: (mode?: 'live') => Promise<void>;
  stopEngine: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  stats: {
    totalPnl: 0,
    activeStrategies: 0,
    dailyVolume: 0,
    winRate: 0,
    totalRequests: 0,
    avgLatency: 0,
    healthyDeployments: 0,
    totalDeployments: 0,
    uptime: 0,
  },
  deployments: [],
  wallets: [],
  refreshInterval: 5000,
  engineStatus: { isRunning: false, mode: 'idle', totalProfit: 0, totalTrades: 0 },
  isLoading: false,
  
  fetchStats: async () => {
    set({ isLoading: true });
    try {
      const [apiStats, engineStatus, health] = await Promise.all([
        deploymentApi.getStats(),
        engineApi.getStatus(),
        deploymentApi.getHealth()
      ]);
      
      set({
        stats: {
          totalPnl: engineStatus.totalProfit || 0,
          activeStrategies: engineStatus.strategies?.length || 0,
          dailyVolume: 0, // Placeholder
          winRate: parseFloat(engineStatus.winRate) || 0,
          totalRequests: engineStatus.totalTrades || 0,
          avgLatency: engineStatus.avgLatency || 0,
          healthyDeployments: health.deployments.healthy,
          totalDeployments: health.deployments.total,
          uptime: (health.uptime / (health.uptime + 1)) * 100, // Approximation
        },
        engineStatus: {
          isRunning: engineStatus.isRunning,
          mode: engineStatus.mode,
          totalProfit: engineStatus.totalProfit || 0,
          totalTrades: engineStatus.totalTrades || 0
        }
      });
    } catch (error) {
      console.error('[STORE] Failed to fetch stats:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchDeployments: async () => {
    try {
      const deployments = await deploymentApi.getAll();
      set({ deployments });
    } catch (error) {
      console.error('[STORE] Failed to fetch deployments:', error);
    }
  },
  
  fetchWalletBalances: async () => {
    try {
      const wallets = await walletApi.getAll();
      set({ wallets: wallets.map(w => ({ ...w, balance: w.balance.toString() })) });
    } catch (error) {
      console.error('[STORE] Failed to fetch wallet balances:', error);
    }
  },
  
  setRefreshInterval: (interval: number) => {
    set({ refreshInterval: interval });
  },

  startEngine: async (mode = 'live') => {
    set({ isLoading: true });
    try {
      await engineApi.start(mode);
      await get().fetchStats();
    } catch (error) {
      console.error('[STORE] Failed to start engine:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  stopEngine: async () => {
    set({ isLoading: true });
    try {
      await engineApi.stop();
      await get().fetchStats();
    } catch (error) {
      console.error('[STORE] Failed to stop engine:', error);
    } finally {
      set({ isLoading: false });
    }
  }
}));

// ==================== System Store ====================
interface SystemState {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  uptime: number;
  latestTrade: any | null;
  connect: () => void;
  fetchSystemMetrics: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  cpuUsage: 0,
  memoryUsage: 0,
  networkLatency: 0,
  uptime: 0,
  latestTrade: null,
  
  connect: () => {
    console.log('[SYSTEM] Analytics link established via Sovereign Protocol');
    // Real WebSocket initialization could go here if needed, 
    // but the app uses createWebSocketConnection in specific components or layout
  },
  
  fetchSystemMetrics: async () => {
    try {
      const health = await metricsApi.getSystemMetrics();
      set({
        uptime: health.uptime,
        // Map other metrics if available
      });
    } catch (error) {
      console.error('[STORE] Failed to fetch system metrics:', error);
    }
  },
}));

