import React, { useState, useEffect } from 'react';
import { Play, Pause, Zap, Loader } from 'lucide-react';

type EngineState = 'IDLE' | 'RUNNING' | 'LOADING';

export const EngineControl: React.FC = () => {
  const [engineState, setEngineState] = useState<EngineState>('LOADING');

  // Fetch initial engine state on component mount
  useEffect(() => {
    const fetchState = async () => {
      try {
        const response = await fetch('/api/engine/state');
        const data = await response.json();
        setEngineState(data.mode === 'LIVE' ? 'RUNNING' : 'IDLE');
      } catch (error) {
        console.error("Failed to fetch engine state:", error);
        setEngineState('IDLE'); // Default to IDLE on error
      }
    };
    fetchState();
  }, []);

  const handleEngineAction = async (action: 'start' | 'pause') => {
    setEngineState('LOADING');
    try {
      const response = await fetch('/api/engine/state', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      setEngineState(data.mode === 'LIVE' ? 'RUNNING' : 'IDLE');
    } catch (error) {
      console.error(`Failed to ${action} engine:`, error);
      // Revert to previous state on error
      setEngineState(action === 'start' ? 'IDLE' : 'RUNNING');
    }
  };

  return (
    <div className="p-4 mt-auto">
      {engineState === 'IDLE' && (
        <button
          onClick={() => handleEngineAction('start')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
        >
          <Play className="w-5 h-5" />
          Start Engine
        </button>
      )}

      {engineState === 'RUNNING' && (
        <div className="flex items-center gap-2">
          <div className="w-2/3 flex items-center justify-center gap-2 px-4 py-3 bg-blue-900/50 border border-blue-700 text-blue-300 font-bold rounded-lg">
            <Zap className="w-5 h-5 animate-pulse" />
            Engine Running
          </div>
          <button
            onClick={() => handleEngineAction('pause')}
            className="w-1/3 flex items-center justify-center p-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            title="Pause Engine"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      )}

      {engineState === 'LOADING' && (
        <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 text-slate-400 font-bold rounded-lg">
          <Loader className="w-5 h-5 animate-spin" />
          Updating...
        </div>
      )}
    </div>
  );
};