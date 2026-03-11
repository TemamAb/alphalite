import { create } from 'zustand';
import { deploymentApi, walletApi, metricsApi, createWebSocketConnection } from '../services/api';

// ==================== Auth Store ====================
// Authentication DISABLED - Open access for all users
interface AuthState {
  isAuthenticated: boolean;
  user: null | { id: string; email: string };
  token: string; // Added for compatibility - always returns a dummy token
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: true, // Always authenticated - auth disabled
  user: { id: 'system', email: 'admin@alphapro.local' },
  token: 'auth-disabled-dummy-token', // Dummy token for API compatibility

  checkAuth: async () => {
    // No-op - always authenticated
    set({ isAuthenticated: true, user: { id: 'system', email: 'admin@alphapro.local' }, token: 'auth-disabled-dummy-token' });
  },

  login: async (email: string, password: string) => {
    // No-op - auth disabled
    console.log('[AUTH] Login called but auth is disabled - allowing access');
    set({ isAuthenticated: true, user: { id: 'system', email: email || 'admin@alphapro.local' }, token: 'auth-disabled-dummy-token' });
  },

  logout: () => {
    // No-op - auth disabled, stay authenticated
    console.log('[AUTH] Logout called but auth is disabled - staying authenticated');
    set({ isAuthenticated: true, user: { id: 'system', email: 'admin@alphapro.local' }, token: 'auth-disabled-dummy-token' });
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

interface EngineStatus {
  isRunning: boolean;
  mode: string;
  totalProfit: number;
}

interface DashboardStats {
  totalPnl: number;
  activeStrategies: number;
  dailyVolume: number;
  winRate: number;
  totalRequests?: number;
  avgLatency?: number;
}

interface DashboardState {
  stats: DashboardStats;
  deployments: Deployment[];
  wallets: Wallet[];
  refreshInterval: number;
  engineStatus: EngineStatus;
  currency: 'USD' | 'ETH';
  withdrawalMode: 'auto' | 'manual';
  isLoading: boolean;
  fetchStats: () => Promise<void>;
  fetchDeployments: () => Promise<void>;
  fetchWalletBalances: () => Promise<void>;
  setRefreshInterval: (interval: number) => void;
  setCurrency: (currency: 'USD' | 'ETH') => void;
  setWithdrawalMode: (mode: 'auto' | 'manual') => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: {
    totalPnl: 0,
    activeStrategies: 0,
    dailyVolume: 0,
    winRate: 0,
    totalRequests: 0,
    avgLatency: 0,
  },
  deployments: [],
  wallets: [],
  refreshInterval: 5000,
  engineStatus: {
    isRunning: true,
    mode: 'live',
    totalProfit: 12.45,
  },
  currency: 'ETH',
  withdrawalMode: 'manual',
  isLoading: false,

  fetchStats: async () => {
    try {
      const data = await deploymentApi.getStats();
      set({
        stats: {
          totalPnl: (data as any).totalPnl || (data as any).profit || 0,
          activeStrategies: (data as any).activeStrategies || (data as any).strategies?.length || 0,
          dailyVolume: (data as any).dailyVolume || (data as any).volume || 0,
          winRate: (data as any).winRate || (data as any).win_rate || 0,
        }
      });
    } catch (error) {
      console.error('[STORE] Failed to fetch stats:', error);
    }
  },

  fetchDeployments: async () => {
    try {
      const data = await deploymentApi.getAll();
      set({
        deployments: (data as any).map((d: any) => ({
          id: d.id,
          name: d.name,
          status: d.status,
          lastDeployed: d.lastDeployed || d.last_deployed || new Date().toISOString()
        }))
      });
    } catch (error) {
      console.error('[STORE] Failed to fetch deployments:', error);
    }
  },

  fetchWalletBalances: async () => {
    try {
      const wallets = await walletApi.getAll();
      set({
        wallets: (wallets as any).map((w: any) => ({
          address: w.address,
          balance: String(w.balance || w.balance_eth || '0'),
          chain: w.chain || 'Ethereum'
        }))
      });
    } catch (error) {
      console.error('[STORE] Failed to fetch wallets:', error);
    }
  },

  setRefreshInterval: (interval: number) => {
    set({ refreshInterval: interval });
  },

  setCurrency: (currency: 'USD' | 'ETH') => {
    set({ currency });
  },

  setWithdrawalMode: (mode: 'auto' | 'manual') => {
    set({ withdrawalMode: mode });
  },
}));

// ==================== System Store ====================
interface SystemState {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  uptime: number;
  ws: WebSocket | null;
  latestTrade: any | null;
  connect: () => void;
  fetchSystemMetrics: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  cpuUsage: 0,
  memoryUsage: 0,
  networkLatency: 0,
  uptime: 0,
  ws: null,
  latestTrade: null,

  connect: () => {
    const ws = createWebSocketConnection((data: any) => {
      if (data.type === 'metrics') {
        set({
          cpuUsage: data.cpu || 0,
          memoryUsage: data.memory || 0,
          networkLatency: data.latency || 0,
        });
      } else if (data.type === 'TRADE_COMPLETED') {
        set({ latestTrade: data.data });
      }
    });
    set({ ws });
  },

  fetchSystemMetrics: async () => {
    try {
      const data = await metricsApi.getSystemMetrics();
      const d = data as any;
      set({
        cpuUsage: d.cpu?.usage || d.cpuUsage || 0,
        memoryUsage: d.memory?.usage || d.memoryUsage || 0,
        networkLatency: d.latency || d.networkLatency || 0,
        uptime: d.uptime || Date.now(),
      });
    } catch (error) {
      console.error('[STORE] Failed to fetch system metrics:', error);
    }
  },
}));
