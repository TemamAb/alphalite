// Deployment Types
export interface Deployment {
  id: string;
  name: string;
  url?: string;
  type?: 'api' | 'brain' | 'client';
  status: DeploymentStatus;
  instance?: string;
  port?: number;
  uptime: number;
  latency?: number;
  region?: string;
  version?: string;
  lastDeploy?: string;
  lastHealthCheck?: string;
  health?: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export type DeploymentStatus = 'healthy' | 'degraded' | 'down' | 'starting';

export interface DeploymentStats {
  totalDeployments: number;
  healthyDeployments: number;
  avgLatency: number;
  totalRequests: number;
  uptime: number;
  profitToday: number;
  lossToday: number;
}

// User Types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer' | 'user';
  createdAt: string;
}

// Wallet Types
export interface Wallet {
  id: string;
  address: string;
  name?: string;
  balance: number;
  chain: string;
  createdAt: string;
  privateKey?: string;
}

// Engine Types
export interface EngineStatus {
  isRunning: boolean;
  mode: string; // Should not be restricted to 'live' only
  strategies: string[];
  totalProfit: number;
  dailyProfit: number;
}

// Health Types
export interface HealthMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: {
    incoming: number;
    outgoing: number;
  };
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  components: ComponentHealth[];
  lastUpdate: string;
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  errorRate?: number;
  details?: Record<string, unknown>;
}

// API Types
export interface ApiMetrics {
  requestsPerMinute: number;
  avgLatency: number;
  errorRate: number;
  activeConnections: number;
}

export interface ApiInstance {
  id: string;
  instanceId: string;
  status: DeploymentStatus;
  metrics: ApiMetrics;
  uptime: number;
}

// Brain Types
export interface BrainMetrics {
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  regime: string;
  confidence: number;
  recommendations: BrainRecommendation[];
}

export interface BrainRecommendation {
  type: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  action: string;
  target: string;
  confidence: number;
}

// Engine Types
export interface EngineMetrics {
  mode: 'LIVE';
  status: 'running' | 'paused' | 'error';
  profit24h: number;
  trades24h: number;
  winRate: number;
  activeStrategies: number;
}

export interface TradeStats {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
  totalGasFees: number;
  avgExecutionTime: number;
}

// Auth Types
export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'health' | 'metrics' | 'deployment' | 'alert';
  payload: unknown;
}
