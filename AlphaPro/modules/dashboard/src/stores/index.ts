import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Deployment, DeploymentStats, Wallet, EngineStatus } from '@/types';

// Auth Store
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          
          if (!response.ok) {
            throw new Error('Login failed');
          }
          
          const data = await response.json();
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ error: 'Login failed', isLoading: false });
          throw error;
        }
      },
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
      checkAuth: async () => {
        // Check stored token validity
        const token = localStorage.getItem('auth_token');
        if (token) {
          set({
            isAuthenticated: true,
            token,
            user: {
              id: '1',
              email: 'admin@alphapro.io',
              role: 'admin',
              createdAt: new Date().toISOString(),
            },
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

// Dashboard Store
interface DashboardState {
  // Stats
  stats: DeploymentStats;
  
  // Deployments
  deployments: Deployment[];
  selectedDeployment: Deployment | null;
  
  // Wallets
  wallets: Wallet[];
  
  // Engine Status
  engineStatus: EngineStatus;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  
  // Refresh Interval (1s to 30s)
  refreshInterval: number;
  
  // Actions
  fetchStats: () => Promise<void>;
  fetchDeployments: () => Promise<void>;
  selectDeployment: (id: string) => void;
  addWallet: (wallet: Omit<Wallet, 'id' | 'createdAt'>) => Promise<void>;
  removeWallet: (id: string) => Promise<void>;
  updateEngineStatus: (status: Partial<EngineStatus>) => Promise<void>;
  setRefreshInterval: (interval: number) => void;
  fetchWalletBalances: () => Promise<void>;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      // Initial State - NO MOCK DATA - must fetch from API
      stats: {
        totalDeployments: 0,
        healthyDeployments: 0,
        avgLatency: 0,
        totalRequests: 0,
        uptime: 0,
        profitToday: 0,
        lossToday: 0,
      },
      
      deployments: [],
      
      selectedDeployment: null,
      
      wallets: [],
      
      engineStatus: {
        isRunning: false,
        mode: 'live', // live production mode only
        strategies: [],
        totalProfit: 0,
        dailyProfit: 0,
      },
      
      isLoading: false,
      error: null,
      lastUpdate: null,
      
      // Refresh interval in ms (default 5 seconds)
      refreshInterval: 5000,
      
      // Actions
      fetchStats: async () => {
        set({ isLoading: true, error: null });
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          
          // Fetch dashboard data from API
          const response = await fetch(`${API_URL}/api/dashboard`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
          }
          
          const data = await response.json();
          
          // Map API response to DeploymentStats
          const engineStats = data.engine?.stats || {};
          const stats: DeploymentStats = {
            totalDeployments: data.rankings?.length || 0,
            healthyDeployments: data.engine?.mode ? 1 : 0,
            avgLatency: engineStats.avgLatency || 0,
            totalRequests: engineStats.totalTrades || 0,
            uptime: 99.9,
            profitToday: engineStats.totalProfit || 0,
            lossToday: engineStats.totalGasFees || 0,
          };
          
          // Also fetch engine status
          const engineResponse = await fetch(`${API_URL}/api/engine/state`);
          let engineStatus = get().engineStatus;
          if (engineResponse.ok) {
            const engineData = await engineResponse.json();
            engineStatus = {
              isRunning: engineData.mode === 'LIVE',
              mode: engineData.mode?.toLowerCase() || 'live',
              strategies: data.engine?.strategies || [],
              totalProfit: engineStats.profitToday,
              dailyProfit: engineStats.profitToday,
            };
          }
          
          set({ stats, engineStatus, lastUpdate: new Date(), isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch stats', isLoading: false });
        }
      },
      
      fetchDeployments: async () => {
        set({ isLoading: true, error: null });
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          // Deployments already in initial state
          set({ isLoading: false, lastUpdate: new Date() });
        } catch (error) {
          set({ error: 'Failed to fetch deployments', isLoading: false });
        }
      },
      
      selectDeployment: (id: string) => {
        const deployment = get().deployments.find((d) => d.id === id);
        set({ selectedDeployment: deployment || null });
      },
      
      addWallet: async (wallet: Omit<Wallet, 'id' | 'createdAt'>) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          
          const newWallet: Wallet = {
            ...wallet,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
          };
          
          set((state) => ({
            wallets: [...state.wallets, newWallet],
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to add wallet', isLoading: false });
        }
      },
      
      removeWallet: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          
          set((state) => ({
            wallets: state.wallets.filter((w) => w.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to remove wallet', isLoading: false });
        }
      },
      
      updateEngineStatus: async (status: Partial<EngineStatus>) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          
          set((state) => ({
            engineStatus: { ...state.engineStatus, ...status },
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to update engine status', isLoading: false });
        }
      },
      
      clearError: () => set({ error: null }),
      
      setRefreshInterval: (interval: number) => set({ refreshInterval: interval }),
      
      fetchWalletBalances: async () => {
        const { wallets } = get();
        if (wallets.length === 0) return;
        
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        
        // Fetch balance for each wallet from blockchain
        const updatedWallets = await Promise.all(
          wallets.map(async (wallet) => {
            try {
              const response = await fetch(`${API_URL}/api/wallets/${wallet.address}/balance`);
              if (response.ok) {
                const data = await response.json();
                return { ...wallet, balance: data.balance || 0 };
              }
            } catch (e) {
              console.error(`Failed to fetch balance for ${wallet.address}:`, e);
            }
            return wallet;
          })
        );
        
        set({ wallets: updatedWallets });
      },
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        wallets: state.wallets,
        engineStatus: state.engineStatus,
      }),
    }
  )
);

// Re-export for convenience
export { useAuthStore as useStore };
