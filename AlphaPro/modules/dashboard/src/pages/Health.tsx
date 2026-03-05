import { useState, useEffect } from 'react';
import { metricsApi } from '@/services/api';
import {
  HeartPulse,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Activity,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import type { SystemHealth, ComponentHealth } from '@/types';

export default function Health() {
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await metricsApi.getSystemMetrics();
        setHealthData(data);
        setErrorMessage(null);
      } catch (err) {
        // Show error state instead of silently using mock data
        setErrorMessage('Failed to fetch health data. API may be unavailable.');
        setHealthData(null);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'down':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <div>
            <p className="text-red-400 font-medium">Error Loading Health Data</p>
            <p className="text-slate-400 text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Health</h2>
          <p className="text-slate-400">Monitor component health and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <HeartPulse className={`w-5 h-5 ${healthData?.overall === 'healthy' ? 'text-green-400' : 'text-yellow-400'} animate-pulse`} />
          <span className={`text-lg font-semibold ${getStatusColor(healthData?.overall || 'healthy')}`}>
            {healthData?.overall.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
      </div>

      {/* Overall Health */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span className="text-slate-400">CPU Usage</span>
          </div>
          <div className="text-2xl font-bold text-white">45%</div>
          <div className="h-1.5 bg-slate-700 rounded-full mt-2">
            <div className="h-full bg-cyan-500 rounded-full" style={{ width: '45%' }} />
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <MemoryStick className="w-5 h-5 text-purple-400" />
            <span className="text-slate-400">Memory</span>
          </div>
          <div className="text-2xl font-bold text-white">62%</div>
          <div className="h-1.5 bg-slate-700 rounded-full mt-2">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: '62%' }} />
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <HardDrive className="w-5 h-5 text-orange-400" />
            <span className="text-slate-400">Disk</span>
          </div>
          <div className="text-2xl font-bold text-white">34%</div>
          <div className="h-1.5 bg-slate-700 rounded-full mt-2">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: '34%' }} />
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <Network className="w-5 h-5 text-green-400" />
            <span className="text-slate-400">Network I/O</span>
          </div>
          <div className="text-2xl font-bold text-white">125 MB/s</div>
          <div className="text-sm text-slate-400 mt-1">↑ 80 / ↓ 45</div>
        </div>
      </div>

      {/* Component Health */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Component Status</h3>
        <div className="space-y-3">
          {(healthData?.components || []).map((component) => (
            <div
              key={component.name}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                selectedComponent === component.name
                  ? 'bg-slate-700'
                  : 'bg-slate-700/30 hover:bg-slate-700/50'
              }`}
              onClick={() => setSelectedComponent(
                selectedComponent === component.name ? null : component.name
              )}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(component.status)}
                <div>
                  <div className="font-medium text-white">{component.name}</div>
                  <div className="text-sm text-slate-400">
                    Status: <span className={getStatusColor(component.status)}>{component.status}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {component.latency !== undefined && (
                  <div className="text-right">
                    <div className="text-sm text-slate-400">Latency</div>
                    <div className="text-white font-medium">{component.latency}ms</div>
                  </div>
                )}
                {component.errorRate !== undefined && (
                  <div className="text-right">
                    <div className="text-sm text-slate-400">Error Rate</div>
                    <div className="text-white font-medium">{component.errorRate.toFixed(2)}%</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Component Details */}
      {selectedComponent && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            {selectedComponent} Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-sm text-slate-400 mb-1">Uptime</div>
              <div className="text-xl font-bold text-white">99.98%</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-sm text-slate-400 mb-1">Requests/min</div>
              <div className="text-xl font-bold text-white">1,234</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-sm text-slate-400 mb-1">Avg Response</div>
              <div className="text-xl font-bold text-white">42ms</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-sm text-slate-400 mb-1">Error Rate</div>
              <div className="text-xl font-bold text-green-400">0.01%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
