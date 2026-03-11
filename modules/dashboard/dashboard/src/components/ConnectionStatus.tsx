import React from 'react';
import { useSystemStore } from '@/stores';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const ConnectionStatus: React.FC = () => {
    const { connectionStatus } = useSystemStore();

    let icon = <WifiOff className="w-4 h-4" />;
    let text = 'Offline';
    let colorClass = 'text-slate-400 bg-slate-800 border-slate-600';

    switch (connectionStatus) {
        case 'connected':
            icon = <Wifi className="w-4 h-4" />;
            text = 'Online';
            colorClass = 'text-green-400 bg-green-500/10 border-green-500/30';
            break;
        case 'connecting':
            icon = <RefreshCw className="w-4 h-4 animate-spin" />;
            text = 'Connecting';
            colorClass = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
            break;
        case 'error':
            icon = <WifiOff className="w-4 h-4" />;
            text = 'Error';
            colorClass = 'text-red-400 bg-red-500/10 border-red-500/30';
            break;
        case 'disconnected':
        default:
             break;
    }

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg ${colorClass} transition-colors duration-300`} title={`WebSocket: ${connectionStatus}`}>
            {icon}
            <span className="text-sm font-medium hidden sm:inline">{text}</span>
        </div>
    );
};

export default ConnectionStatus;