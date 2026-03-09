import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { Activity, ExternalLink, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';

interface CompetitorActivity {
    address: string;
    name: string;
    txCount: number;
    lastActive: number;
    status: 'active' | 'dormant';
}

const CompetitorMonitor: React.FC = () => {
    const [competitors, setCompetitors] = useState<CompetitorActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuthStore.getState();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    useEffect(() => {
        const fetchData = async () => {
            try {
                setError(null);
                const headers = { 'Authorization': `Bearer ${token}` };
                const res = await fetch(`${API_URL}/api/competitors/activity`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setCompetitors(Array.isArray(data) ? data : []);
                } else {
                    setError('Failed to fetch competitor data');
                    setCompetitors([]);
                }
            } catch (error) {
                console.error("Failed to fetch competitor activity:", error);
                setError('Network error fetching competitor data');
                setCompetitors([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [token, API_URL]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(competitors.length / pageSize));
    const paginatedCompetitors = competitors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    if (loading) return <div className="p-4 text-gray-500 text-xs">Loading Competitor Data...</div>;

    if (error) return (
        <CollapsiblePanel title="MEV Bot Tracker" icon={<Activity className="w-5 h-5 text-red-400" />} defaultExpanded={true}>
            <div className="p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">{error}</p>
                <p className="text-slate-500 text-xs mt-2">Please check your connection and try again</p>
            </div>
        </CollapsiblePanel>
    );

    return (
        <CollapsiblePanel title="MEV Bot Tracker" icon={<Activity className="w-5 h-5 text-red-400" />} defaultExpanded={true}>
            <div className="p-4 space-y-3">
                {paginatedCompetitors.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No competitor data available</p>
                    </div>
                ) : (
                    <>
                {paginatedCompetitors.map((bot) => (
                    <div key={bot.address} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${bot.status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
                            <div>
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                    {bot.name}
                                    <a 
                                        href={`https://etherscan.io/address/${bot.address}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-slate-500 hover:text-blue-400"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                                <div className="text-xs text-slate-400 font-mono">{bot.address.slice(0, 6)}...{bot.address.slice(-4)}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-red-400">{bot.txCount} txs</div>
                            <div className="text-[10px] text-slate-500">{bot.lastActive > 0 ? `${Math.floor((Date.now() - bot.lastActive) / 1000)}s ago` : 'Inactive'}</div>
                        </div>
                    </div>
                ))}

                {/* Pagination Controls */}
                {competitors.length > pageSize && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Rows:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={15}>15</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, paginatedCompetitors.length)} of {paginatedCompetitors.length}</span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-7 h-7 text-xs rounded ${
                                        currentPage === page 
                                            ? 'bg-cyan-500 text-white' 
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="p-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
                </>
            </div>
        </CollapsiblePanel>
    );
};

export default CompetitorMonitor;
