import React, { useState, useEffect, useRef } from 'react';
import { useSystemStore } from '@/stores';
import { Activity, ArrowRight, ExternalLink } from 'lucide-react';

interface TradeEvent {
    txHash: string;
    pair: string;
    strategy: { name: string };
    profit: string;
    timestamp: number;
    chain: string;
}

const TradeFeed: React.FC = () => {
    const [trades, setTrades] = useState<TradeEvent[]>([]);
    const latestTrade = useSystemStore((state) => state.latestTrade);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (latestTrade) {
            setTrades(prev => {
                // Keep only the last 20 trades to prevent memory issues
                const newTrades = [latestTrade, ...prev].slice(0, 20);
                return newTrades;
            });
        }
    }, [latestTrade]);

    const getScanUrl = (chain: string, hash: string) => {
        if (chain === 'arbitrum') return `https://arbiscan.io/tx/${hash}`;
        if (chain === 'polygon') return `https://polygonscan.com/tx/${hash}`;
        return `https://etherscan.io/tx/${hash}`;
    };

    if (trades.length === 0) {
        return (
            <div className="w-full bg-slate-900 border-b border-slate-800 h-10 flex items-center px-4 text-xs text-slate-500">
                <Activity className="w-3 h-3 mr-2 animate-pulse" />
                Waiting for live trades...
            </div>
        );
    }

    return (
        <div className="w-full bg-slate-900 border-b border-slate-800 h-10 overflow-hidden flex items-center relative">
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none"></div>
            
            <div className="flex items-center gap-8 animate-scroll whitespace-nowrap px-4" ref={scrollRef}>
                {trades.map((trade, idx) => (
                    <div key={`${trade.txHash}-${idx}`} className="flex items-center gap-2 text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {new Date(trade.timestamp).toLocaleTimeString([], { hour12: false })}
                        </span>
                        <span className="font-bold text-cyan-400">{trade.pair}</span>
                        <span className="text-slate-500 text-[10px] uppercase">{trade.strategy?.name}</span>
                        <span className="flex items-center gap-1 font-mono font-bold text-green-400">
                            +{parseFloat(trade.profit).toFixed(4)} ETH
                        </span>
                        <a 
                            href={getScanUrl(trade.chain, trade.txHash)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-slate-600 hover:text-white transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TradeFeed;