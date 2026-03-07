import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Deployment, DeploymentStats, Wallet, EngineStatus, AuthState as AuthStateTypes, SystemHealth, ApiMetrics, BrainMetrics, EngineMetrics, TradeStats, WebSocketMessage } from '@/types';

// Auth Store
type AuthState = AuthStateTypes & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await fetch(`/api/auth/login`, {
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
        // This function should validate the token with the backend
        const token = get().token;
        if (token) {
          try {
            set({ isLoading: true });
            const response = await fetch(`/api/auth/me`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (!response.ok) {
              throw new Error('Token validation failed');
            }
            const user = await response.json();
            set({ isAuthenticated: true, user, isLoading: false });
          } catch (error) {
            // Token is invalid, log out the user
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          }
        } else {
          set({
            isLoading: false
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
  refreshInterval: number;
  
  // Actions
  fetchStats: () => Promise<void>;
  fetchDeployments: () => Promise<void>;
  selectDeployment: (id: string) => void;
  addWallet: (wallet: Omit<Wallet, 'id' | 'createdAt'>) => Promise<void>;
  removeWallet: (id: string) => Promise<void>;
  updateEngineStatus: (status: Partial<EngineStatus>) => Promise<void>;
  fetchWalletBalances: () => Promise<void>;
  clearError: () => void;
  updateStatsFromRealtime: (tradeStats: TradeStats, engineMetrics: EngineMetrics) => void;
  setRefreshInterval: (interval: number) => void;
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
        isRunning: false, // This will be updated from the API
        mode: 'offline', // Default status before first fetch
        strategies: [],
        totalProfit: 0,
        dailyProfit: 0,
      },
      
      isLoading: false,
      error: null,
      lastUpdate: null,
      refreshInterval: 5000,
      
      setRefreshInterval: (interval: number) => set({ refreshInterval: interval }),
      
      fetchStats: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/stats');
          if (!response.ok) {
            throw new Error('Failed to fetch stats');
          }
          const stats: DeploymentStats = await response.json();
          set({ stats, isLoading: false, lastUpdate: new Date() });
        } catch (error) {
          set({ error: 'Failed to fetch stats', isLoading: false });
        }
      },

      fetchDeployments: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/deployments');
          if (!response.ok) {
            throw new Error('Failed to fetch deployments');
          }
          const deployments: Deployment[] = await response.json();
          set({ deployments, isLoading: false, lastUpdate: new Date() });
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
          // Per security review, NEVER send private key to the server from the client.
          const { privateKey, ...walletData } = wallet;
          const response = await fetch('/api/wallets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(walletData),
          });

          if (!response.ok) {
            throw new Error('Failed to add wallet');
          }

          const newWallet: Wallet = await response.json();
          
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
          const response = await fetch(`/api/wallets/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to remove wallet');
          }

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
          const response = await fetch('/api/engine/state', {
            method: 'POST', // Or PATCH
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(status),
          });

          if (!response.ok) {
            throw new Error('Failed to update engine status');
          }

          const updatedStatus = await response.json();

          set((state) => ({
            engineStatus: { ...state.engineStatus, ...updatedStatus },
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to update engine status', isLoading: false });
        }
      },
      
      clearError: () => set({ error: null }),
      
      fetchWalletBalances: async () => {
        const { wallets } = get();
        if (wallets.length === 0) return;
        
        // Fetch balance for each wallet from blockchain
        const updatedWallets = await Promise.all(
          wallets.map(async (wallet) => {
            try {
              const response = await fetch(`/api/wallets/${wallet.address}/balance`);
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

      updateStatsFromRealtime: (tradeStats: TradeStats, engineMetrics: EngineMetrics) => {
        set((state) => {
          // Derive stats that depend on other state slices
          const healthyDeployments = state.deployments.filter(d => d.status === 'healthy').length;

          const newStats: DeploymentStats = {
            totalDeployments: state.deployments.length,
            healthyDeployments: healthyDeployments,
            avgLatency: tradeStats.avgExecutionTime,
            totalRequests: tradeStats.totalTrades,
            uptime: 0, // Uptime is per-deployment, not a global stat in this model
            profitToday: tradeStats.totalProfit,
            lossToday: tradeStats.totalGasFees,
          };

          const newEngineStatus: EngineStatus = {
            isRunning: engineMetrics.status === 'running',
            mode: engineMetrics.mode.toLowerCase(),
            // Preserve strategies as they are not part of the metrics stream
            strategies: state.engineStatus.strategies,
            totalProfit: tradeStats.totalProfit,
            dailyProfit: engineMetrics.profit24h,
          };
          
          return { stats: newStats, engineStatus: newEngineStatus, lastUpdate: new Date() };
        });
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

// --- Enterprise Upgrade: Real-time System & Metrics Store (via WebSocket) ---

interface SystemState {
  // WebSocket connection
  ws: WebSocket | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  
  // Real-time data from backend (as defined in types/index.ts)
  systemHealth: SystemHealth | null;
  apiMetrics: ApiMetrics | null;
  brainMetrics: BrainMetrics | null;
  engineMetrics: EngineMetrics | null;
  tradeStats: TradeStats | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
}

let wsRetryTimeout: number;
let wsRetryAttempts = 0;

export const useSystemStore = create<SystemState>()((set, get) => ({
  ws: null,
  connectionStatus: 'disconnected',
  systemHealth: null,
  apiMetrics: null,
  brainMetrics: null,
  engineMetrics: null,
  tradeStats: null,

  connect: () => {
    if (get().ws || get().connectionStatus === 'connecting') {
      return; // Already connected or connecting
    }

    set({ connectionStatus: 'connecting' });

    // Use the host of the current page to construct the WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WS] Connection established');
      set({ connectionStatus: 'connected' });
      wsRetryAttempts = 0; // Reset retry attempts on successful connection
      clearTimeout(wsRetryTimeout);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'health':
            set({ systemHealth: message.payload as SystemHealth });
            break;
          case 'metrics': {
            const metricsPayload = message.payload as { type: string; data: unknown };
            switch (metricsPayload.type) {
              case 'api':
                set({ apiMetrics: metricsPayload.data as ApiMetrics });
                break;
              case 'brain':
                set({ brainMetrics: metricsPayload.data as BrainMetrics });
                break;
              case 'engine':
                set({ engineMetrics: metricsPayload.data as EngineMetrics });
                break;
              case 'trades':
                set({ tradeStats: metricsPayload.data as TradeStats });
                break;
            }
            break;
          }
          default:
            console.warn(`[WS] Received unknown message type: ${(message as any).type}`);
        }
      } catch (error) {
        console.error('[WS] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] WebSocket error:', error);
      set({ connectionStatus: 'error' });
    };

    ws.onclose = () => {
      set({ ws: null, connectionStatus: 'disconnected' });

      // Per architecture review: Implement exponential backoff with jitter for reconnection
      const baseDelay = 1000; // 1 second
      const maxDelay = 30000; // 30 seconds
      const jitter = Math.random() * 500;
      const delay = Math.min(maxDelay, baseDelay * 2 ** wsRetryAttempts) + jitter;
      
      console.log(`[WS] Reconnecting in ${Math.round(delay / 1000)}s... (Attempt ${wsRetryAttempts + 1})`);
      
      wsRetryTimeout = window.setTimeout(() => {
        wsRetryAttempts++;
        get().connect();
      }, delay);
    };

    set({ ws });
  },

  disconnect: () => {
    clearTimeout(wsRetryTimeout);
    get().ws?.close();
  },
}));

// Re-export for convenience
export { useAuthStore as useStore };
