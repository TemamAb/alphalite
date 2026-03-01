import React from 'react';
import { BenchmarkDashboard } from './components/BenchmarkDashboard';
import { ProfitControl } from './components/ProfitControl';
import { StrategiesPanel } from './StrategiesPanel';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <header className="mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          AlphaPro <span className="text-sm text-slate-500 font-mono">v1.0.0-RC1</span>
        </h1>
        <p className="text-slate-400 mt-2">Competitive Dominance Arbitrage System</p>
      </header>
      
      <main className="max-w-6xl mx-auto space-y-8">
        <BenchmarkDashboard />
        <ProfitControl />
        <StrategiesPanel />
      </main>
    </div>
  );
}

export default App;
