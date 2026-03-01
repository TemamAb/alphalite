import React from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { BenchmarkDashboard } from './components/BenchmarkDashboard';
import { ProfitControl } from './components/ProfitControl';
import { StrategiesPanel } from './StrategiesPanel';
import { AlphaCopilot } from './components/AlphaCopilot';

function App() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Strategy Performance Section */}
        <BenchmarkDashboard />
        
        {/* Profit Control */}
        <ProfitControl />
        
        {/* Strategies Panel */}
        <StrategiesPanel />
        
        {/* Alpha Copilot (full width at bottom) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AlphaCopilot />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default App;
