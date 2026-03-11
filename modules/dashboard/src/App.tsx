import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Home from './pages/Home';
import Strategies from './pages/Strategies';
import BlockchainStream from './pages/BlockchainStream';
import AlphaCopilot from './pages/AlphaCopilot';
import Health from './pages/Health';
import Settings from './pages/Settings';
import AIOptimizer from './components/AIOptimizer';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Home />} />
            <Route path="home" element={<Home />} />
            <Route path="strategies" element={<Strategies />} />
            <Route path="blockchain" element={<BlockchainStream />} />
            <Route path="copilot" element={<AlphaCopilot />} />
            <Route path="ai-optimizer" element={<AIOptimizer />} />
            <Route path="health" element={<Health />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
