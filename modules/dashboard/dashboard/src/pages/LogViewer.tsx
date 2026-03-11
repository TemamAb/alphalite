import { useState } from 'react';
import { useSystemStore } from '@/stores';
import { ScrollText, Search, Filter, Download, Trash2 } from 'lucide-react';

export default function LogViewer() {
  const { logs } = useSystemStore();
  const [searchTerm, setSearchQuery] = useState('');
  const [filterPersona, setFilterPersona] = useState('ALL');

  // Extract unique personas from logs for filter
  const personas = Array.from(new Set(logs.map(log => {
    const match = log.match(/^\[(.*?)]/);
    return match ? match[1] : 'SYSTEM';
  }))).sort();

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPersona = filterPersona === 'ALL' || log.startsWith(`[${filterPersona}]`);
    return matchesSearch && matchesPersona;
  });

  const handleExport = () => {
    const blob = new Blob([filteredLogs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alphapro-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Logs</h2>
          <p className="text-slate-400">Real-time persona decisions and system events</p>
        </div>
        <div className="flex gap-2">
            <button
            onClick={() => useSystemStore.setState({ logs: [] })}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/30"
            >
            <Trash2 className="w-4 h-4" />
            Clear
            </button>
            <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
            >
            <Download className="w-4 h-4" />
            Export
            </button>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterPersona}
              onChange={(e) => setFilterPersona(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-8 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
            >
              <option value="ALL">All Personas</option>
              {personas.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden h-[600px] overflow-y-auto custom-scrollbar p-4 font-mono text-xs">
          {filteredLogs.length > 0 ? (
            <div className="space-y-1">
              {filteredLogs.map((log, index) => {
                 const personaMatch = log.match(/^\[(.*?)]/);
                 const persona = personaMatch ? personaMatch[1] : 'SYSTEM';
                 const message = log.replace(/^\[.*?]\s*/, '');
                 
                 let colorClass = 'text-slate-300';
                 if (persona === 'SNIPER') colorClass = 'text-red-400';
                 else if (persona === 'STRATEGIST') colorClass = 'text-purple-400';
                 else if (persona === 'SENTINEL') colorClass = 'text-green-400';
                 else if (persona === 'OPTIMIZER') colorClass = 'text-yellow-400';
                 else if (persona === 'ARCHITECT') colorClass = 'text-cyan-400';
                 else if (persona === 'ENGINEER') colorClass = 'text-orange-400';

                 return (
                   <div key={index} className="flex gap-3 hover:bg-slate-900/50 p-1.5 rounded border-b border-slate-800/50 last:border-0">
                     <span className={`font-bold w-24 shrink-0 ${colorClass}`}>{persona}</span>
                     <span className="text-slate-300 break-all">{message}</span>
                   </div>
                 );
              })}
            </div>
          ) : (
            <div className="text-center text-slate-500 py-12">No logs found matching criteria</div>
          )}
        </div>
        <div className="mt-2 text-xs text-slate-500 text-right">
            Showing {filteredLogs.length} events
        </div>
      </div>
    </div>
  );
}