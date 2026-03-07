import { useState, useEffect } from 'react';
import { metricsApi } from '@/services/api';
import DataTable from '@/components/DataTable';
import CollapsiblePanel from '@/components/CollapsiblePanel';
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

interface ComponentRow {
  name: string;
  status: string;
  latency?: number;
  errorRate?: number;
}

export default function Health() {
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  // Day-based health metrics data
  const formatDayRow = (dayIndex: number, totalDays: number = 7): string => {
    if (dayIndex === 0) return 'Today';
    const dayNumber = totalDays - dayIndex;
    return `Day ${dayNumber}`;
  };

  const generateDayBasedHealthData = (totalDays: number = 7) => {
    const data = [];
    for (let i = 0; i < totalDays; i++) {
      const baseCpu = 40 + i * 2;
      const baseMem = 55 + i * 3;
      const baseDisk = 30 + i * 2;
      const baseUptime = 99.5 + Math.random() * 0.5;
      data.push({
        day: formatDayRow(i, totalDays),
        dayIndex: i,
        cpu: Math.floor(baseCpu + Math.random() * 5),
        memory: Math.floor(baseMem + Math.random() * 5),
        disk: Math.floor(baseDisk + Math.random() * 3),
        uptime: Number(baseUptime.toFixed(2)),
        latency: Math.floor(35 + Math.random() * 15),
        errors: Math.floor(Math.random() * 5),
      });
    }
    return data;
  };

  const [dayBasedHealthData] = useState(generateDayBasedHealthData(7));

  // Column definitions for day-based health table
  const healthDayColumns = [
    { key: 'cpu', label: 'CPU %', format: (v: number) => `${v}%` },
    { key: 'memory', label: 'MEMORY %', format: (v: number) => `${v}%` },
    { key: 'disk', label: 'DISK %', format: (v: number) => `${v}%` },
    { key: 'uptime', label: 'UPTIME', format: (v: number) => `${v}%` },
    { key: 'latency', label: 'LATENCY', format: (v: number) => `${v}ms` },
    { key: 'errors', label: 'ERRORS', format: (v: number) => v.toString() },
  ];

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await metricsApi.getSystemMetrics();
        setHealthData(data);
        setErrorMessage(null);
      } catch (err) {
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
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <span className="px-2 py-1 rounded-full bg-green-900/30 text-green-400 text-xs font-medium">HEALTHY</span>;
      case 'degraded': return <span className="px-2 py-1 rounded-full bg-yellow-900/30 text-yellow-400 text-xs font-medium">DEGRADED</span>;
      case 'down': return <span className="px-2 py-1 rounded-full bg-red-900/30 text-red-400 text-xs font-medium">DOWN</span>;
      default: return <span className="px-2 py-1 rounded-full bg-slate-700 text-slate-400 text-xs font-medium">UNKNOWN</span>;
    }
  };

  // Component data for table
  const componentData: ComponentRow[] = (healthData?.components || []).map((c) => ({
    name: c.name,
    status: c.status,
    latency: c.latency,
    errorRate: c.errorRate,
  }));

  const componentColumns = [
    { key: 'name', label: 'COMPONENT', align: 'left' as const, sortable: true },
    { key: 'status', label: 'STATUS', align: 'center' as const, sortable: true, render: (v: string) => getStatusBadge(v) },
    { key: 'latency', label: 'LATENCY', align: 'right' as const, sortable: true, render: (v: number | undefined) => v ? <span className="text-slate-300">{v}ms</span> : <span className="text-slate-500">—</span> },
    { key: 'errorRate', label: 'ERROR RATE', align: 'right' as const, sortable: true, render: (v: number | undefined) => v ? <span className={v > 1 ? 'text-red-400' : 'text-green-400'}>{v.toFixed(2)}%</span> : <span className="text-slate-500">—</span> },
  ];

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <div>
            <p className="text-red-400 font-medium">Error Loading Health Data</p>
            <p className="text-slate-400 text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Health</h2>
          <p className="text-slate-400">Monitor component health and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <HeartPulse className={`w-5 h-5 ${healthData?.overall === 'healthy' ? 'text-green-400' : 'text-yellow-400'} animate-pulse`} />
          <span className={`text-lg font-semibold ${getStatusColor(healthData?.overall || 'healthy')}`}>
            {(healthData?.overall || 'UNKNOWN').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span className="text-slate-400">CPU Usage</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">45%</div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: '45%' }} />
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <MemoryStick className="w-5 h-5 text-purple-400" />
            <span className="text-slate-400">Memory</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">62%</div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: '62%' }} />
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <HardDrive className="w-5 h-5 text-orange-400" />
            <span className="text-slate-400">Disk</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">34%</div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: '34%' }} />
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <Network className="w-5 h-5 text-green-400" />
            <span className="text-slate-400">Network I/O</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">125 MB/s</div>
          <div className="text-sm text-slate-400">↑ 80 / ↓ 45</div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Component Status</h3>
        <DataTable
          data={componentData}
          columns={componentColumns}
          firstColumnLabel="COMPONENT"
          pageSize={10}
          searchable={true}
          searchPlaceholder="Search components..."
          striped={true}
          hoverable={true}
          onRowClick={(row) => setSelectedComponent(selectedComponent === row.name ? null : row.name)}
        />
      </div>

      {selectedComponent && (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">{selectedComponent} Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Uptime</div>
              <div className="text-xl font-bold text-white">99.98%</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Requests/min</div>
              <div className="text-xl font-bold text-white">1,234</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Avg Response</div>
              <div className="text-xl font-bold text-white">42ms</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Error Rate</div>
              <div className="text-xl font-bold text-green-400">0.01%</div>
            </div>
          </div>
        </div>
      )}

      {/* Day-Based Health Metrics */}
      <CollapsiblePanel 
        title="HEALTH METRICS BY DAY" 
        defaultExpanded={false}
        preview={
          <div className="p-3 bg-slate-800/30">
            <table className="w-full text-xs font-mono"><tbody><tr>
              <td className="py-1 text-slate-300 font-medium">Today</td>
              <td className="py-1 text-right text-slate-200">{dayBasedHealthData[0]?.cpu?.toString() || '0'}%</td>
              <td className="py-1 text-right text-slate-200">{dayBasedHealthData[0]?.memory?.toString() || '0'}%</td>
              <td className="py-1 text-right text-slate-200">{dayBasedHealthData[0]?.disk?.toString() || '0'}%</td>
              <td className="py-1 text-right text-emerald-400">{dayBasedHealthData[0]?.uptime?.toFixed(2) || '0.00'}%</td>
              <td className="py-1 text-right text-slate-200">{dayBasedHealthData[0]?.latency?.toString() || '0'}ms</td>
              <td className="py-1 text-right text-slate-200">{dayBasedHealthData[0]?.errors?.toString() || '0'}</td>
            </tr></tbody></table>
          </div>
        }
      >
        <div className="p-3">
          <DataTable 
            data={dayBasedHealthData} 
            columns={healthDayColumns}
            firstColumnLabel="DAY"
            defaultSort="desc"
            showTotals={true}
          />
        </div>
      </CollapsiblePanel>
    </div>
  );
}
