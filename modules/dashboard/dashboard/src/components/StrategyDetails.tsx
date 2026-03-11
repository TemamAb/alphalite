import React, { useState, useMemo, useEffect } from 'react';
import { X, ExternalLink, CheckCircle, XCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useSystemStore } from '@/stores';

interface Trade {
    timestamp: string;
    strategy?: { name: string };
    pair?: string;
    netProfit?: number;
    status: 'success' | 'failed';
    txHash?: string;
    chain?: string;
}

interface StrategyDetailsProps {
    day: string;
    trades: Trade[];
    onClose: () => void;
}

const TRADES_PER_PAGE = 15;

const StrategyDetails: React.FC<StrategyDetailsProps> = ({ day, trades, onClose }) => {
    const [liveTrades, setLiveTrades] = useState<Trade[]>(trades);
    const [selectedStrategy, setSelectedStrategy] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const latestTrade = useSystemStore((state) => state.latestTrade);

    // Update trades in real-time if a new trade for the current day arrives
    useEffect(() => {
        if (latestTrade) {
            const tradeDate = new Date(latestTrade.timestamp).toLocaleDateString();
            // This is a simplification. A robust solution would compare against the actual date of the 'day' prop.
            // For "Today", this works well.
            if (day === 'Today' && tradeDate === new Date().toLocaleDateString()) {
                setLiveTrades(prev => {
                    // Avoid duplicates
                    if (prev.some(t => t.txHash === latestTrade.txHash)) return prev;
                    return [latestTrade, ...prev];
                });
            }
        }
    }, [latestTrade, day]);

    const uniqueStrategies = useMemo(() => {
        const strategies = new Set<string>();
        liveTrades.forEach(trade => {
            if (trade.strategy?.name) {
                strategies.add(trade.strategy.name);
            }
        });
        return Array.from(strategies);
    }, [liveTrades]);

    const filteredTrades = useMemo(() => {
        let result = liveTrades;
        if (selectedStrategy !== 'all') {
            result = result.filter(trade => trade.strategy?.name === selectedStrategy);
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(trade => 
                (trade.pair?.toLowerCase() || '').includes(query) || 
                (trade.txHash?.toLowerCase() || '').includes(query)
            );
        }
        return result;
    }, [liveTrades, selectedStrategy, searchQuery]);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedStrategy, searchQuery]);

    const paginatedTrades = useMemo(() => {
        const start = (currentPage - 1) * TRADES_PER_PAGE;
        return filteredTrades.slice(start, start + TRADES_PER_PAGE);
    }, [filteredTrades, currentPage]);

    const summary = useMemo(() => {
        const tradeCount = filteredTrades.length;
        if (tradeCount === 0) {
            return { totalProfit: 0, winRate: 0, tradeCount: 0 };
        }

        const totalProfit = filteredTrades.reduce((sum, trade) => sum + (trade.netProfit || 0), 0);
        const winCount = filteredTrades.filter(trade => trade.status === 'success').length;
        const winRate = (winCount / tradeCount) * 100;

        return { totalProfit, winRate, tradeCount };
    }, [filteredTrades]);

    const totalPages = Math.ceil(filteredTrades.length / TRADES_PER_PAGE);

    const getEtherscanUrl = (chain: string | undefined, txHash: string | undefined) => {
        if (!txHash) return '#';
        const baseUrl = chain === 'arbitrum' ? 'https://arbiscan.io/tx/' : 'https://etherscan.io/tx/';
        return `${baseUrl}${txHash}`;
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in-20"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-slate-700">
                    <div className="flex items-center gap-4 flex-1">
                        <h2 className="text-lg font-bold text-white whitespace-nowrap">
                            Trade Details for <span className="text-cyan-400">{day}</span>
                        </h2>
                        <div className="relative max-w-xs w-full">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search pair or tx hash..."
                                className="w-full bg-slate-800 border border-slate-600 rounded-md pl-8 pr-3 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
                            />
                        </div>
                        {uniqueStrategies.length > 1 && (
                            <select
                                value={selectedStrategy}
                                onChange={(e) => setSelectedStrategy(e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                            >
                                <option value="all">All Strategies</option>
                                {uniqueStrategies.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-800 z-10">
                            <tr>
                                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase">Time</th>
                                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase">Strategy</th>
                                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase">Pair</th>
                                <th className="p-3 text-right text-xs font-medium text-slate-400 uppercase">Profit (ETH)</th>
                                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Tx</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {paginatedTrades.length > 0 ? paginatedTrades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((trade, index) => (
                                <tr key={trade.txHash || index} className="hover:bg-slate-800/50">
                                    <td className="p-3 text-slate-400 font-mono">{new Date(trade.timestamp).toLocaleTimeString()}</td>
                                    <td className="p-3 text-white font-medium">{trade.strategy?.name || 'N/A'}</td>
                                    <td className="p-3 text-slate-300 font-mono text-xs">{trade.pair || 'N/A'}</td>
                                    <td className={`p-3 text-right font-mono ${trade.netProfit && trade.netProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>{trade.netProfit?.toFixed(5) || '0.00000'}</td>
                                    <td className="p-3 text-center">{trade.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-red-500 mx-auto" />}</td>
                                    <td className="p-3 text-center"><a href={getEtherscanUrl(trade.chain, trade.txHash)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300"><ExternalLink className="w-4 h-4 mx-auto" /></a></td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No trades match the selected filter.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Summary */}
                <div className="p-3 border-t border-slate-700 bg-slate-800/50 flex items-center justify-between">
                    {/* Pagination Controls */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-slate-400">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Summary Metrics */}
                    <div className="flex items-center gap-6 text-right">
                    <div>
                        <div className="text-xs text-slate-400 uppercase">Trades</div>
                        <div className="text-sm font-bold text-white">{summary.tradeCount}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 uppercase">Win Rate</div>
                        <div className="text-sm font-bold text-green-400">{summary.winRate.toFixed(1)}%</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 uppercase">Total Profit</div>
                        <div className={`text-sm font-bold ${summary.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {summary.totalProfit.toFixed(5)} ETH
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StrategyDetails;