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
  isAuthenticated: false,
  user: null,
  
  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      set({ isAuthenticated: true });
    }
  },
  
  login: async (email: string, password: string) => {
    const mockUser = { id: '1', email };
    localStorage.setItem('auth_token', 'mock_token');
    set({ isAuthenticated: true, user: mockUser });
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
    // Mock data - replace with actual API calls
    set({
      stats: {
        totalPnl: 12500,
        activeStrategies: 5,
        dailyVolume: 250000,
        winRate: 72,
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
  fetchSystemMetrics: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  cpuUsage: 0,
  memoryUsage: 0,
  networkLatency: 0,
  uptime: 0,
  
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
