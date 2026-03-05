import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores';
import { Fish, AlertTriangle, ExternalLink, Activity } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';

interface WhaleEvent {
    hash: string;
    from: string;
    to: string;
    valueEth: string;
    valueUsd: string;
    type: 'WHALE_MOVEMENT' | 'COMPETITOR_DETECTED';
    timestamp: number;
    priority: string;
}

const WhaleFeed: React.FC = () => {
    const [events, setEvents] = useState<WhaleEvent[]>([]);
    const { token } = useAuthStore.getState();
    const wsRef = useRef<WebSocket | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const WS_URL = API_URL.replace(/^http/, 'ws').replace('/api', '') + '/ws';

    // Fetch initial history
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const headers = { 'Authorization': `Bearer ${token}` };
                const res = await fetch(`${API_URL}/api/metrics/whales`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setEvents(data);
                }
            } catch (error) {
                console.error("Failed to fetch whale history:", error);
            }
        };
        fetchHistory();
    }, [token, API_URL]);

    // Connect to WebSocket for live updates
    useEffect(() => {
        const connectWs = () => {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    // Listen for blockchain events that might be whale movements if categorized as such
                    // Or if we add a specific WHALE_EVENT type in the backend broadcast
                    if (message.type === 'BLOCKCHAIN_EVENT' && (message.data.category === 'WHALE' || message.data.type === 'WHALE_MOVEMENT' || message.data.type === 'COMPETITOR_DETECTED')) {
                         setEvents(prev => [message.data, ...prev].slice(0, 50));
                    }
                } catch (e) {
                    // ignore
                }
            };

            ws.onclose = () => setTimeout(connectWs, 3000);
        };

        connectWs();
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, [WS_URL]);

    const formatAddress = (addr: string) => {
        if (!addr) return 'Unknown';
        return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    };

    return (
        <CollapsiblePanel title="Whale & Competitor Feed" icon={<Fish className="w-5 h-5 text-blue-400" />} defaultExpanded={true}>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-0">
                {events.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-xs">No whale activity detected yet.</div>
                ) : (
                    <div className="divide-y divide-gray-800">
                        {events.map((evt) => (
                            <div key={evt.hash + evt.timestamp} className={`p-3 hover:bg-slate-800/50 transition-colors ${evt.type === 'COMPETITOR_DETECTED' ? 'bg-red-900/10' : ''}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        {evt.type === 'COMPETITOR_DETECTED' ? (
                                            <AlertTriangle className="w-3 h-3 text-red-500" />
                                        ) : (
                                            <Activity className="w-3 h-3 text-blue-500" />
                                        )}
                                        <span className={`text-xs font-bold ${evt.type === 'COMPETITOR_DETECTED' ? 'text-red-400' : 'text-blue-400'}`}>
                                            {evt.type === 'COMPETITOR_DETECTED' ? 'COMPETITOR' : 'WHALE'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                                </div>
                                
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-mono text-white">{evt.valueEth} ETH</span>
                                    <span className="text-xs text-gray-400">${(parseFloat(evt.valueUsd) / 1000).toFixed(1)}k</span>
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-gray-500">
                                    <div className="flex gap-1">
                                        <span>{formatAddress(evt.from)}</span>
                                        <span>→</span>
                                        <span>{formatAddress(evt.to)}</span>
                                    </div>
                                    <a href={`https://etherscan.io/tx/${evt.hash}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400">
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </CollapsiblePanel>
    );
};

export default WhaleFeed;