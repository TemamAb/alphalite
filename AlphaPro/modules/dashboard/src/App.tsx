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
import { useAuthStore } from './stores';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkAuth } = useAuthStore();
  
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  // Production mode - authentication REQUIRED for security
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
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
          <Route path="health" element={<Health />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
