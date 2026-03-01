import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export const StrategiesPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastReloaded, setLastReloaded] = useState<Date | null>(null);
  const [autoReload, setAutoReload] = useState(false);
  const [reloadInterval, setReloadInterval] = useState(30); // Default 30 seconds

  const handleReloadStrategies = async () => {
    setIsLoading(true);
    setStatus(null);
    try {
      const response = await fetch('/api/engine/strategies/reload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'alphapro-secret-key-dev'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStatus({
        type: 'success',
        message: `Successfully reloaded ${data.count} strategies.`
      });
      setLastReloaded(new Date());
    } catch (error) {
      console.error("Failed to reload strategies:", error);
      setStatus({
        type: 'error',
        message: 'Failed to reload strategies. Check console for details.'
      });
    } finally {
      setIsLoading(false);
      // Clear status after 3 seconds
      setTimeout(() => setStatus(null), 3000);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (autoReload) {
      interval = setInterval(() => {
        handleReloadStrategies();
      }, reloadInterval * 1000);
    }
    return () => clearInterval(interval);
  }, [autoReload, reloadInterval]);

  return (
    <div className="bg-slate-800/50 p-4 rounded border border-slate-700 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-300">Strategy Management</h3>
        {lastReloaded && (
          <span className="text-xs text-slate-500">Last reloaded: {lastReloaded.toLocaleTimeString()}</span>
        )}
        {status && (
          <div className={`flex items-center gap-1 text-xs ${status.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {status.type === 'success' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            <span>{status.message}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoReload}
            onChange={(e) => setAutoReload(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label className="text-xs text-slate-400">Auto-reload every</label>
        </div>
        <input
          type="number"
          min="5"
          value={reloadInterval}
          onChange={(e) => setReloadInterval(Math.max(5, parseInt(e.target.value, 10) || 30))}
          className="w-12 bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs text-white text-center focus:outline-none focus:border-blue-500"
        />
        <span className="text-xs text-slate-400">seconds</span>
      </div>

      <button
        onClick={handleReloadStrategies}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Reloading...' : 'Reload Strategies from Disk'}
      </button>
    </div>
  );
};