// App.tsx - Main React Application
import { useState, useEffect } from 'react';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize the application
    const init = async () => {
      try {
        // Check API connectivity
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error('API not available');
        }
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    init();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading AlphaPro...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center bg-red-500/10 border border-red-500/30 rounded-lg p-6">
          <h1 className="text-red-400 text-xl mb-2">Connection Error</h1>
          <p className="text-slate-400">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white">AlphaPro</h1>
          <p className="text-slate-400">DeFi Trading Engine</p>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Dashboard Card */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Dashboard</h2>
            <p className="text-slate-400">View your trading performance and metrics</p>
          </div>

          {/* Strategies Card */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Strategies</h2>
            <p className="text-slate-400">Manage and monitor your trading strategies</p>
          </div>

          {/* Wallets Card */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Wallets</h2>
            <p className="text-slate-400">Manage your connected wallets</p>
          </div>

          {/* Engine Card */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Engine</h2>
            <p className="text-slate-400">Control the trading engine</p>
          </div>

          {/* Analytics Card */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Analytics</h2>
            <p className="text-slate-400">View detailed trading analytics</p>
          </div>

          {/* Settings Card */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>
            <p className="text-slate-400">Configure your preferences</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
