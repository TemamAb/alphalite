import { useState } from 'react';
import { engineApi } from '../services/api';

const AIOptimizer = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<string | null>(null);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const result = await engineApi.triggerOptimization();
      setOptimizationResults(result.message || 'Optimization cycle triggered successfully.');
    } catch (error) {
      console.error('Optimization failed:', error);
      setOptimizationResults('Failed to trigger optimization. Check logs for details.');
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">AI Optimizer</h2>
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="mb-4 text-gray-300">
          Use AI to automatically optimize your trading parameters based on market conditions.
        </p>
        <button
          onClick={handleOptimize}
          disabled={isOptimizing}
          className={`px-4 py-2 rounded ${isOptimizing
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white transition-colors`}
        >
          {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
        </button>
        {optimizationResults && (
          <div className="mt-4 p-4 bg-green-900/50 rounded border border-green-500">
            <p className="text-green-400">{optimizationResults}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIOptimizer;
