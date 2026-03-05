import { useState, useEffect } from 'react';
import { useDashboardStore } from '@/stores';
import {
  Gauge,
  RefreshCw,
  Zap,
  TrendingUp,
  Clock,
  Target,
  CheckCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface OptimizationMetric {
  name: string;
  current: number;
  previous: number;
  unit: string;
  improvement: number;
}

interface OptimizationCycle {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'pending';
  startTime: string;
  duration: number;
  improvements: number;
}

export default function AutoOptimization() {
  const { isLoading, fetchStats, engineStatus } = useDashboardStore();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentCycle, setCurrentCycle] = useState<OptimizationCycle | null>(null);

  // Optimization metrics
  const [metrics, setMetrics] = useState<OptimizationMetric[]>([
    { name: 'Optimizations/min', current: 12.5, previous: 10.2, unit: 'opt/min', improvement: 22.5 },
    { name: 'Total Cycles/hour', current: 45, previous: 38, unit: 'cycles', improvement: 18.4 },
    { name: 'Improvements/hour', current: 156, previous: 128, unit: 'improvements', improvement: 21.9 },
    { name: 'Gas Efficiency', current: 94.2, previous: 87.5, unit: '%', improvement: 7.7 },
    { name: 'Execution Speed', current: 98.5, previous: 92.0, unit: '%', improvement: 7.1 },
    { name: 'Strategy Win Rate', current: 72.5, previous: 65.2, unit: '%', improvement: 11.2 },
  ]);

  // Historical data
  const [dailyStats, setDailyStats] = useState({
    totalOptimizations: 12450,
    totalCycles: 1080,
    totalImprovements: 37440,
    avgImprovement: 23.5,
    bestCycle: 'MEV Parameter Tuning',
  });

  // Recent optimization cycles
  const [recentCycles, setRecentCycles] = useState<OptimizationCycle[]>([
    { id: '1', name: 'Gas Price Adjustment', status: 'completed', startTime: '2 min ago', duration: 45, improvements: 12 },
    { id: '2', name: 'Route Optimization', status: 'completed', startTime: '5 min ago', duration: 62, improvements: 18 },
    { id: '3', name: 'Slippage Tuning', status: 'completed', startTime: '8 min ago', duration: 38, improvements: 8 },
    { id: '4', name: 'Dex Allocation', status: 'completed', startTime: '12 min ago', duration: 55, improvements: 15 },
    { id: '5', name: 'Timing Adjustment', status: 'running', startTime: 'now', duration: 0, improvements: 0 },
  ]);

  useEffect(() => {
    fetchStats();
    
    // Simulate live updates
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(m => ({
        ...m,
        current: m.current + (Math.random() - 0.5) * 0.5,
        improvement: ((m.current - m.previous) / m.previous) * 100,
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRunOptimization = () => {
    setIsOptimizing(true);
    
    // Simulate optimization cycle
    const newCycle: OptimizationCycle = {
      id: Date.now().toString(),
      name: 'Manual Optimization',
      status: 'running',
      startTime: 'now',
      duration: 0,
      improvements: 0,
    };
    setCurrentCycle(newCycle);

    setTimeout(() => {
      setIsOptimizing(false);
      setCurrentCycle(null);
      setRecentCycles(prev => [
        { ...newCycle, status: 'completed', duration: 45, improvements: Math.floor(Math.random() * 20) + 5 },
        ...prev.slice(0, 4)
      ]);
    }, 3000);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return value.toFixed(1);
  };

  const getNextOptimization = () => {
    const optimizations = [
      'Gas Price Rebalancing',
      'Multi-Path Route Tuning',
      'Slippage Parameter Update',
      'DEX Priority Reorder',
      'Timing Window Adjustment',
      'MEV Protection Enhancement',
    ];
    return optimizations[Math.floor(Math.random() * optimizations.length)];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Auto Optimization</h2>
          <p className="text-slate-400">AI-powered strategy optimization and tuning</p>
        </div>
        <button
          onClick={handleRunOptimization}
          disabled={isOptimizing}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isOptimizing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
        </button>
      </div>

      {/* Running Optimization */}
      {currentCycle && (
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl p-6 border border-cyan-500/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Running: {currentCycle.name}</h3>
              <p className="text-slate-400 text-sm">Analyzing market conditions and adjusting parameters...</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-cyan-400">
                {Math.floor(Math.random() * 100)}%
              </div>
              <div className="text-xs text-slate-500">Progress</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-cyan-400" />
                <span className="text-slate-400 text-sm">{metric.name}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                metric.improvement >= 0 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {metric.improvement >= 0 ? '+' : ''}{metric.improvement.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-white">
                {formatNumber(metric.current)}
                <span className="text-sm text-slate-500 ml-1">{metric.unit}</span>
              </div>
              <div className="text-xs text-slate-500">
                was {formatNumber(metric.previous)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-slate-400 text-sm">Today</span>
          </div>
          <div className="text-xl font-bold text-white">
            {dailyStats.totalOptimizations.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">optimizations</div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400 text-sm">Cycles Today</span>
          </div>
          <div className="text-xl font-bold text-white">
            {dailyStats.totalCycles}
          </div>
          <div className="text-xs text-slate-500">total cycles</div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-400 text-sm">Improvements</span>
          </div>
          <div className="text-xl font-bold text-white">
            {dailyStats.totalImprovements.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">today</div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400 text-sm">Avg Improvement</span>
          </div>
          <div className="text-xl font-bold text-green-400">
            +{dailyStats.avgImprovement}%
          </div>
          <div className="text-xs text-slate-500">per optimization</div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-red-400" />
            <span className="text-slate-400 text-sm">Best Cycle</span>
          </div>
          <div className="text-lg font-bold text-white truncate">
            {dailyStats.bestCycle}
          </div>
          <div className="text-xs text-slate-500">highest impact</div>
        </div>
      </div>

      {/* Recent Cycles & Next Optimization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cycles */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-white">Recent Optimization Cycles</h3>
          </div>
          <div className="divide-y divide-slate-700/50">
            {recentCycles.map((cycle) => (
              <div key={cycle.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    cycle.status === 'completed' 
                      ? 'bg-green-500/20' 
                      : cycle.status === 'running'
                      ? 'bg-cyan-500/20'
                      : 'bg-slate-700'
                  }`}>
                    {cycle.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : cycle.status === 'running' ? (
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium">{cycle.name}</div>
                    <div className="text-xs text-slate-500">{cycle.startTime}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">{cycle.duration}s</div>
                  <div className="text-xs text-slate-500">{cycle.improvements} improvements</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Optimization */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Next Scheduled Optimization</h3>
          
          <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <ArrowRight className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-medium">{getNextOptimization()}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Estimated Duration</span>
              <span className="text-white">30-60 seconds</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Auto-run Interval</span>
              <span className="text-white">Every 5 minutes</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Last Optimization</span>
              <span className="text-white">2 minutes ago</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Next Run In</span>
              <span className="text-cyan-400 font-medium">~3 minutes</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <button className="w-full text-center text-sm text-cyan-400 hover:text-cyan-300">
              View Full Optimization History →
            </button>
          </div>
        </div>
      </div>

      {/* Engine Status */}
      <div className={`rounded-xl p-4 border ${
        engineStatus.mode === 'live' 
          ? 'bg-green-500/10 border-green-500/30' 
          : 'bg-yellow-500/10 border-yellow-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className={`w-5 h-5 ${engineStatus.mode === 'live' ? 'text-green-400' : 'text-yellow-400'}`} />
            <span className="text-white font-medium">
              Auto Optimization: {engineStatus.isRunning ? 'ACTIVE' : 'PAUSED'}
            </span>
          </div>
          <span className="text-slate-400 text-sm">
            Mode: {engineStatus.mode.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
