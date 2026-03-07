import { useState, useEffect } from 'react';
import Tooltip from '@/components/Tooltip';
import CollapsiblePanel from '@/components/CollapsiblePanel';
import {
  Shield,
  RefreshCw,
  Lock,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Ghost,
  Radar,
  Target,
} from 'lucide-react';

interface SecurityMetric {
  name: string;
  value: number;
  unit: string;
  status: 'protected' | 'warning' | 'critical';
  description: string;
}

export default function Security() {
  const [isLoading, setIsLoading] = useState(false);

  // MEV Protection Metrics
  const [mevProtection, setMevProtection] = useState<SecurityMetric[]>([
    { name: 'MEV Shield Active', value: 98.5, unit: '%', status: 'protected', description: 'Percentage of transactions protected from MEV extraction' },
    { name: 'Sandwich Attacks Blocked', value: 156, unit: 'attacks', status: 'protected', description: 'Number of sandwich attacks prevented today' },
    { name: 'Arbitrage Front-Run Prevented', value: 42, unit: 'attempts', status: 'protected', description: 'Attempts to front-run our arbitrage trades blocked' },
    { name: 'Gas Price Manipulation Detected', value: 0, unit: 'attempts', status: 'protected', description: 'Price manipulation attempts detected and neutralized' },
  ]);

  // Frontrun Protection Metrics
  const [frontrunProtection, setFrontrunProtection] = useState<SecurityMetric[]>([
    { name: 'Transaction Privacy', value: 94.2, unit: '%', status: 'protected', description: 'Transactions obfuscated from public mempool inspection' },
    { name: 'Frontrun Attempts Blocked', value: 28, unit: 'attempts', status: 'protected', description: 'External frontrunners blocked from extracting value' },
    { name: 'Slippage Protection', value: 99.1, unit: '%', status: 'protected', description: 'Trades executed within acceptable slippage bounds' },
    { name: 'Optimal Execution', value: 97.8, unit: '%', status: 'protected', description: 'Trades executed at optimal gas prices' },
  ]);

  // Stealth Mode Metrics
  const [stealthMode, setStealthMode] = useState<SecurityMetric[]>([
    { name: 'Stealth Address Rotation', value: 12, unit: 'rotations', status: 'protected', description: 'Number of stealth addresses rotated to avoid detection' },
    { name: 'Transaction Timing Randomization', value: 85, unit: '%', status: 'protected', description: 'Randomized timing to prevent pattern analysis' },
    { name: 'Address Similarity Score', value: 0.12, unit: '%', status: 'protected', description: 'Similarity to known trading patterns (lower = more stealth)' },
    { name: 'On-Chain Footprint', value: 2.5, unit: '%', status: 'warning', description: 'On-chain visibility (lower = more stealth)' },
    { name: 'Detection Avoidance', value: 96.5, unit: '%', status: 'protected', description: 'Success rate at avoiding detection by scanners' },
    { name: 'MEV Blocker Bypass', value: 99.2, unit: '%', status: 'protected', description: 'Successfully bypassing MEV blocker services' },
  ]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'protected':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'protected':
        return 'bg-green-900/30 text-green-400';
      case 'warning':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'critical':
        return 'bg-red-900/30 text-red-400';
      default:
        return 'bg-slate-700 text-slate-400';
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') return `${value}%`;
    if (unit === '$') return `$${value.toLocaleString()}`;
    return `${value} ${unit}`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-mono">SECURITY</h2>
          <p className="text-xs text-slate-500 font-mono">Protection & Stealth Metrics</p>
        </div>
        <Tooltip content="Refresh security metrics from monitoring systems">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 text-slate-300 text-xs font-mono rounded hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </Tooltip>
      </div>

      {/* Overall Security Score */}
      <CollapsiblePanel 
        title="OVERALL SECURITY SCORE" 
        tooltip="Combined protection score across all security measures"
        defaultExpanded={true}
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-900/50 border-2 border-green-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400 font-mono">97.8%</div>
                <div className="text-xs text-slate-500">Security Rating</div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-mono ${getStatusBg('protected')}`}>
              PROTECTED
            </div>
          </div>
          <table className="w-full text-xs font-mono">
            <tbody>
              <tr className="border-b border-slate-700/30">
                <td className="py-2 text-slate-400">MEV PROTECTION</td>
                <td className="py-2 text-right text-green-400">98.5%</td>
              </tr>
              <tr className="border-b border-slate-700/30">
                <td className="py-2 text-slate-400">FRONTRUN PROTECTION</td>
                <td className="py-2 text-right text-green-400">97.0%</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-400">STEALTH SCORE</td>
                <td className="py-2 text-right text-green-400">96.5%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>

      {/* MEV Protection */}
      <CollapsiblePanel 
        title="MEV PROTECTION" 
        tooltip="Protection against Maximal Extractable Value attacks"
        defaultExpanded={true}
      >
        <div className="p-3">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700/30">
                <th className="text-left py-2 font-medium">PROTECTION METRIC</th>
                <th className="text-right py-2 font-medium">VALUE</th>
                <th className="text-right py-2 font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {mevProtection.map((metric, index) => (
                <Tooltip key={index} content={metric.description}>
                  <tr className="border-b border-slate-700/30 cursor-help">
                    <td className="py-2 text-slate-400 flex items-center gap-2">
                      <Radar className="w-3 h-3 text-purple-400" />
                      {metric.name}
                    </td>
                    <td className="py-2 text-right text-slate-200">
                      {formatValue(metric.value, metric.unit)}
                    </td>
                    <td className="py-2 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusBg(metric.status)}`}>
                        {metric.status === 'protected' ? 'PROTECTED' : metric.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                </Tooltip>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>

      {/* Frontrun Protection */}
      <CollapsiblePanel 
        title="FRONTRUN PROTECTION" 
        tooltip="Protection against transaction front-running"
        defaultExpanded={true}
      >
        <div className="p-3">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700/30">
                <th className="text-left py-2 font-medium">PROTECTION METRIC</th>
                <th className="text-right py-2 font-medium">VALUE</th>
                <th className="text-right py-2 font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {frontrunProtection.map((metric, index) => (
                <Tooltip key={index} content={metric.description}>
                  <tr className="border-b border-slate-700/30 cursor-help">
                    <td className="py-2 text-slate-400 flex items-center gap-2">
                      <Target className="w-3 h-3 text-red-400" />
                      {metric.name}
                    </td>
                    <td className="py-2 text-right text-slate-200">
                      {formatValue(metric.value, metric.unit)}
                    </td>
                    <td className="py-2 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusBg(metric.status)}`}>
                        {metric.status === 'protected' ? 'PROTECTED' : metric.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                </Tooltip>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>

      {/* Stealth Mode */}
      <CollapsiblePanel 
        title="STEALTH MODE" 
        tooltip="How undetected AlphaPro is operating to avoid being targeted"
        defaultExpanded={true}
      >
        <div className="p-3">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700/30">
                <th className="text-left py-2 font-medium">STEALTH METRIC</th>
                <th className="text-right py-2 font-medium">VALUE</th>
                <th className="text-right py-2 font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {stealthMode.map((metric, index) => (
                <Tooltip key={index} content={metric.description}>
                  <tr className="border-b border-slate-700/30 cursor-help">
                    <td className="py-2 text-slate-400 flex items-center gap-2">
                      <EyeOff className="w-3 h-3 text-cyan-400" />
                      {metric.name}
                    </td>
                    <td className="py-2 text-right text-slate-200">
                      {formatValue(metric.value, metric.unit)}
                    </td>
                    <td className="py-2 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusBg(metric.status)}`}>
                        {metric.status === 'protected' ? 'STEALTH' : metric.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                </Tooltip>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>

      {/* Recent Security Events */}
      <CollapsiblePanel 
        title="SECURITY EVENTS" 
        tooltip="Recent security events and alerts"
        defaultExpanded={false}
      >
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-slate-400">MEV Shield activated - 156 attacks blocked</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-slate-400">Frontrun protection - 28 attempts blocked</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-slate-400">Stealth mode - Address rotated 12 times</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <AlertTriangle className="w-3 h-3 text-yellow-400" />
            <span className="text-slate-400">On-chain footprint higher than optimal</span>
          </div>
        </div>
      </CollapsiblePanel>
    </div>
  );
}
