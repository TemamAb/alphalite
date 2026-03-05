import type { Deployment, DeploymentStats, SystemHealth, ApiMetrics, Wallet, EngineStatus } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Generic fetch wrapper with error handling
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Deployment API
export const deploymentApi = {
  getAll: () => fetchApi<Deployment[]>('/api/deployments'),
  
  getById: (id: string) => fetchApi<Deployment>(`/api/deployments/${id}`),
  
  getStats: () => fetchApi<DeploymentStats>('/api/deployments/stats'),
  
  getHealth: () => fetchApi<SystemHealth>('/api/deployments/health'),
  
  deploy: (config: Partial<Deployment>) => 
    fetchApi<Deployment>('/api/deployments', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  
  restart: (id: string) => 
    fetchApi<Deployment>(`/api/deployments/${id}/restart`, {
      method: 'POST',
    }),
  
  stop: (id: string) => 
    fetchApi<Deployment>(`/api/deployments/${id}/stop`, {
      method: 'POST',
    }),
  
  update: (id: string, config: Partial<Deployment>) =>
    fetchApi<Deployment>(`/api/deployments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(config),
    }),
};

// Metrics API
export const metricsApi = {
  getApiMetrics: () => fetchApi<ApiMetrics>('/api/metrics/api'),
  
  getSystemMetrics: () => fetchApi<SystemHealth>('/api/metrics/system'),
  
  getHistoricalMetrics: (params: { from: string; to: string; interval?: string }) => 
    fetchApi<Array<{ timestamp: string; value: number }>>(
      `/api/metrics/history?from=${params.from}&to=${params.to}&interval=${params.interval || '1m'}`
    ),
};

// Wallet API
export const walletApi = {
  getAll: () => fetchApi<Wallet[]>('/api/wallets'),
  
  add: (wallet: Omit<Wallet, 'id' | 'createdAt'>) =>
    fetchApi<Wallet>('/api/wallets', {
      method: 'POST',
      body: JSON.stringify(wallet),
    }),
  
  // Add wallet with private key (for trading)
  addWithKey: (wallet: { address: string; privateKey: string; name: string; chain: string }) =>
    fetchApi<Wallet>('/api/wallets/add', {
      method: 'POST',
      body: JSON.stringify(wallet),
    }),
  
  // Bulk import wallets
  bulkImport: (wallets: { address: string; privateKey?: string; name: string; chain: string }[]) =>
    fetchApi<Wallet[]>('/api/wallets/import', {
      method: 'POST',
      body: JSON.stringify({ addresses: wallets.map(w => w.address), keys: wallets.filter(w => w.privateKey).map(w => w.privateKey) }),
    }),
  
  // Verify private key and get address
  verifyKey: (privateKey: string) =>
    fetchApi<{ address: string }>('/api/wallets/verify-key', {
      method: 'POST',
      body: JSON.stringify({ privateKey }),
    }),
  
  remove: (id: string) =>
    fetchApi<void>(`/api/wallets/${id}`, {
      method: 'DELETE',
    }),
  
  getBalance: (address: string) =>
    fetchApi<{ balance: number; lastUpdate: string }>(`/api/wallets/${address}/balance`),
  
  validate: (address: string) =>
    fetchApi<{ valid: boolean; chain: string }>(`/api/wallets/validate?address=${address}`),
};

// Engine API
export const engineApi = {
  getStatus: () => fetchApi<EngineStatus>('/api/engine/status'),
  
  start: (mode: 'live') =>
    fetchApi<EngineStatus>('/api/engine/state', {
      method: 'POST',
      body: JSON.stringify({ action: 'start', mode: 'LIVE' }),
    }),
  
  stop: () =>
    fetchApi<EngineStatus>('/api/engine/state', {
      method: 'POST',
      body: JSON.stringify({ action: 'pause' }),
    }),
  
  getStrategies: () =>
    fetchApi<string[]>('/api/engine/strategies'),
  
  addStrategy: (strategy: string) =>
    fetchApi<string[]>('/api/engine/strategies', {
      method: 'POST',
      body: JSON.stringify({ strategy }),
    }),
  
  removeStrategy: (strategy: string) =>
    fetchApi<string[]>(`/api/engine/strategies/${encodeURIComponent(strategy)}`, {
      method: 'DELETE',
    }),
  
  getProfitHistory: (params?: { days?: number }) =>
    fetchApi<Array<{ date: string; profit: number; loss: number }>>(
      `/api/engine/profit?days=${params?.days || 7}`
    ),
};

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<{ token: string; user: { id: string; email: string; role: string } }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    ),
  
  logout: () =>
    fetchApi<void>('/api/auth/logout', {
      method: 'POST',
    }),
  
  refreshToken: () =>
    fetchApi<{ token: string }>('/api/auth/refresh', {
      method: 'POST',
    }),
  
  getCurrentUser: () =>
    fetchApi<{ id: string; email: string; role: string }>('/api/auth/me'),
};

// Health check helper
export async function checkHealth(): Promise<boolean> {
  try {
    await fetchApi<{ status: string }>('/api/health');
    return true;
  } catch {
    return false;
  }
}

// WebSocket connection for real-time updates
export function createWebSocketConnection(
  onMessage: (data: unknown) => void,
  onError?: (error: Event) => void
): WebSocket {
  const wsUrl = API_BASE_URL.replace('http', 'ws') + '/ws';
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    onError?.(error);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
  };

  return ws;
}
