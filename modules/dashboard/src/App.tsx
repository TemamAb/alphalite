import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
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
