import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DashboardLayout from './components/DashboardLayout';
import Home from './pages/Home';
import Strategies from './pages/Strategies';
import Security from './pages/Security';
import BlockchainStream from './pages/BlockchainStream';
import AlphaCopilot from './pages/AlphaCopilot';
import Health from './pages/Health';
import Settings from './pages/Settings';
import AIOptimizer from './components/AIOptimizer';
import { useAuthStore } from './stores';
import ErrorBoundary from './components/ErrorBoundary';

function LoginPage() {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Mock signup - in production, call your signup API
      const mockUser = { id: '1', email };
      localStorage.setItem('auth_token', 'mock_token');
      useAuthStore.setState({ isAuthenticated: true, user: mockUser });
    } catch (error) {
      console.error('Signup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1a1a2e',
    }}>
      <div style={{
        backgroundColor: '#16213e',
        padding: '2rem',
        borderRadius: '1rem',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h1 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          AlphaPro Login
        </h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#0f3460',
                border: '1px solid #533483',
                borderRadius: '0.5rem',
                color: '#fff',
              }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#0f3460',
                border: '1px solid #533483',
                borderRadius: '0.5rem',
                color: '#fff',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#e94560',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#fff',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkAuth } = useAuthStore();
  
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  // Production mode - authentication REQUIRED for security
  // Auth can only be disabled via explicit env var in production builds
  if (!isAuthenticated) {
    // Check environment - auth is REQUIRED by default, only disabled via explicit flag
    const authDisabled = import.meta.env.VITE_AUTH_DISABLED === 'true';
    if (!authDisabled) {
      return <Navigate to="/login" replace />;
    }
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="home" element={<Home />} />
            <Route path="strategies" element={<Strategies />} />
            <Route path="security" element={<Security />} />
            <Route path="blockchain" element={<BlockchainStream />} />
            <Route path="copilot" element={<AlphaCopilot />} />
            <Route path="ai-optimizer" element={<AIOptimizer />} />
            <Route path="health" element={<Health />} />
            <Route path="settings" element={<Settings />} />
            <Route path="logs" element={<Navigate to="/" replace />} />
            <Route path="wallets" element={<Navigate to="/" replace />} />
            <Route path="rankings" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
