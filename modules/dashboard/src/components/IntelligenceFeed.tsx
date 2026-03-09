import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { useSystemStore } from '@/stores';

interface IntelligenceFeedProps {
    persona?: string;
    className?: string;
}

const IntelligenceFeed: React.FC<IntelligenceFeedProps> = ({ persona = 'auto', className = '' }) => {
    const systemLogs = useSystemStore((state) => state.logs);
    const [displayLogs, setDisplayLogs] = useState<string[]>([]);

    useEffect(() => {
        if (persona === 'auto') {
            setDisplayLogs(systemLogs);
        } else {
            // Filter logs for specific persona if needed, or show all if persona is active
            setDisplayLogs(systemLogs.filter(log => log.includes(`[${persona.toUpperCase()}]`)));
        }
    }, [systemLogs, persona]);

    return (
        <div className={`bg-slate-900 rounded-2xl border border-slate-700 flex flex-col overflow-hidden ${className}`}>
            <div className="p-3 border-b border-slate-700 bg-slate-800/50 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-slate-200">LIVE INTELLIGENCE ({persona.toUpperCase()})</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-3 custom-scrollbar">
                {displayLogs.length > 0 ? displayLogs.map((log, i) => (
                    <div key={i} className={`border-l-2 pl-3 py-1 ${
                        log.includes('SNIPER') ? 'border-red-500 text-red-200' :
                        log.includes('STRATEGIST') ? 'border-purple-500 text-purple-200' :
                        log.includes('SENTINEL') ? 'border-green-500 text-green-200' :
                        log.includes('OPTIMIZER') ? 'border-yellow-500 text-yellow-200' :
                        log.includes('ARCHITECT') ? 'border-cyan-500 text-cyan-200' :
                        log.includes('ENGINEER') ? 'border-orange-500 text-orange-200' :
                        'border-slate-500 text-slate-300'
                    }`}>
                        {log}
                    </div>
                )) : (
                    <div className="text-slate-500 italic">Waiting for intelligence stream...</div>
                )}
            </div>
        </div>
    );
};

export default IntelligenceFeed;