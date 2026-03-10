import { create } from 'zustand';
import { deploymentApi, walletApi, metricsApi, createWebSocketConnection } from '../services/api';

// ==================== Auth Store ====================
interface AuthState {
  isAuthenticated: boolean;
  user: null | { id: string; email: string };
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      set({ isAuthenticated: true });
    }
  },

  login: async (email: string, password: string) => {
    const API_URL = import.meta.env.VITE_API_URL || '';

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();

    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      set({ isAuthenticated: true, user: data.user });
    } else {
      throw new Error('No token received');
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({ isAuthenticated: false, user: null });
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
}

interface DashboardState {
  stats: DashboardStats;
  deployments: Deployment[];
  wallets: Wallet[];
  refreshInterval: number;
  engineStatus: string;
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
  },
  deployments: [],
  wallets: [],
  refreshInterval: 5000,
  engineStatus: 'idle',

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
