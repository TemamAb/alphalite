import { useState } from 'react';
import { useDashboardStore } from '@/stores';
import { deploymentApi } from '@/services/api';
import {
  Server,
  RefreshCw,
  Square,
  MoreVertical,
  ExternalLink,
  Clock,
  Activity,
} from 'lucide-react';

export default function Deployments() {
  const { deployments, isLoading, fetchDeployments } = useDashboardStore();
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleRestart = async (id: string) => {
    setActionLoading(id);
    try {
      await deploymentApi.restart(id);
      await fetchDeployments();
    } catch (error) {
      console.error('Failed to restart:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (id: string) => {
    setActionLoading(id);
    try {
      await deploymentApi.stop(id);
      await fetchDeployments();
    } catch (error) {
      console.error('Failed to stop:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Deployments</h2>
          <p className="text-slate-400">Manage your AlphaPro instances</p>
        </div>
        <button
          onClick={() => fetchDeployments()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Deployments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deployments.map((deployment) => (
          <div
            key={deployment.id}
            className={`bg-slate-800/50 rounded-xl p-4 border transition-all ${
              selectedDeployment === deployment.id
                ? 'border-cyan-500'
                : 'border-slate-700 hover:border-slate-600'
            }`}
            onClick={() => setSelectedDeployment(deployment.id)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(deployment.status)}`} />
                <div>
                  <h3 className="font-semibold text-white">{deployment.name}</h3>
                  <p className="text-sm text-slate-400">{deployment.region}</p>
                </div>
              </div>
              <div className="relative">
                <button className="p-1 text-slate-400 hover:text-white transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* URL */}
            {deployment.url && (
              <a
                href={deployment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 mb-4"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                {deployment.url}
              </a>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  Latency
                </div>
                <div className="text-lg font-semibold text-white">{deployment.latency}ms</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Activity className="w-3 h-3" />
                  Uptime
                </div>
                <div className="text-lg font-semibold text-white">{deployment.uptime.toFixed(2)}%</div>
              </div>
            </div>

            {/* Health Bars */}
            {deployment.health && (
              <div className="space-y-2 mb-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">CPU</span>
                    <span className="text-white">{deployment.health.cpu}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${deployment.health.cpu}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Memory</span>
                    <span className="text-white">{deployment.health.memory}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${deployment.health.memory}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestart(deployment.id);
                }}
                disabled={actionLoading === deployment.id}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${actionLoading === deployment.id ? 'animate-spin' : ''}`} />
                Restart
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStop(deployment.id);
                }}
                disabled={actionLoading === deployment.id || deployment.status === 'down'}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-50 transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            </div>

            {/* Version & Last Deploy */}
            <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between text-xs text-slate-500">
              <span>v{deployment.version || '1.0.0'}</span>
              <span>
                {deployment.lastDeploy
                  ? `Deployed ${new Date(deployment.lastDeploy).toLocaleDateString()}`
                  : 'Never deployed'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {deployments.length === 0 && (
        <div className="text-center py-12">
          <Server className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Deployments</h3>
          <p className="text-slate-400">Deploy your first AlphaPro instance to get started</p>
        </div>
      )}
    </div>
  );
}
