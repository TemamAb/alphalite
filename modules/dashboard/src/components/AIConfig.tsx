import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { Settings, Save, RefreshCw, AlertTriangle } from 'lucide-react';

const AIConfig: React.FC = () => {
    const [mutationRate, setMutationRate] = useState(0.1);
    const [interval, setInterval] = useState(30);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const token = useAuthStore((state) => state.token);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${API_URL}/api/ai/optimizer`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.config) {
                setMutationRate(data.config.mutationRate);
                setInterval(data.config.optimizationInterval / 1000);
            }
        } catch (error) {
            console.error("Failed to fetch AI config", error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setSuccess(false);
        try {
            await fetch(`${API_URL}/api/ai/optimizer/config`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mutationRate,
                    optimizationInterval: interval * 1000
                })
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error("Failed to save AI config", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Settings className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-white">AI Hyperparameters</h3>
            </div>

            <div className="space-y-6">
                {/* Mutation Rate */}
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-sm text-slate-400">Mutation Rate (Aggression)</label>
                        <span className="text-sm font-mono text-purple-400">{(mutationRate * 100).toFixed(0)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0.01"
                        max="0.5"
                        step="0.01"
                        value={mutationRate}
                        onChange={(e) => setMutationRate(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Higher values increase exploration but risk destabilizing profitable strategies.
                    </p>
                </div>

                {/* Optimization Interval */}
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-sm text-slate-400">Optimization Interval</label>
                        <span className="text-sm font-mono text-purple-400">{interval}s</span>
                    </div>
                    <input
                        type="range"
                        min="5"
                        max="300"
                        step="5"
                        value={interval}
                        onChange={(e) => setInterval(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Frequency of genetic evolution cycles. Lower values react faster to market changes.
                    </p>
                </div>

                {/* Actions */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-700/50">
                    <div className="flex items-center gap-2 text-yellow-500/80 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Changes apply immediately</span>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                            success 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {success ? 'Saved!' : 'Update Config'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIConfig;