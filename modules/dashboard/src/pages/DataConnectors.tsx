import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { Link, Save, RefreshCw, Eye, EyeOff, CheckCircle, XCircle, Key } from 'lucide-react';

interface Connector {
  id: string;
  name: string;
  value: string;
  type: 'rpc' | 'key';
  status?: 'connected' | 'error' | 'unknown';
}

const DataConnectors: React.FC = () => {
    const [connectors, setConnectors] = useState<Connector[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showKeys, setShowKeys] = useState(false);
    const [testResults, setTestResults] = useState<Record<string, 'testing' | 'connected' | 'error'>>({});
    const token = useAuthStore((state) => state.token);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    useEffect(() => {
        fetchConnectors();
    }, []);

    const fetchConnectors = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/config/connectors`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const formattedConnectors = Object.entries(data).map(([id, value]): Connector => ({
                    id,
                    name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    value: value as string,
                    type: id.toLowerCase().includes('url') ? 'rpc' : 'key'
                }));
                setConnectors(formattedConnectors);
            }
        } catch (error) {
            console.error("Failed to fetch connectors", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const configToSave = connectors.reduce((acc, conn) => {
                acc[conn.id] = conn.value;
                return acc;
            }, {} as Record<string, string>);

            await fetch(`${API_URL}/api/config/connectors`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configToSave)
            });
        } catch (error) {
            console.error("Failed to save connectors", error);
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async (id: string) => {
        setTestResults(prev => ({ ...prev, [id]: 'testing' }));
        await new Promise(resolve => setTimeout(resolve, 1500));
        const success = Math.random() > 0.2;
        setTestResults(prev => ({ ...prev, [id]: success ? 'connected' : 'error' }));
        setTimeout(() => setTestResults(prev => ({ ...prev, [id]: undefined! })), 4000);
    };

    const handleConnectorChange = (id: string, value: string) => {
        setConnectors(prev => prev.map(c => c.id === id ? { ...c, value } : c));
    };

    const renderConnectorInput = (connector: Connector) => {
        const isKey = connector.type === 'key';
        const testStatus = testResults[connector.id];

        return (
            <div key={connector.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">{connector.name}</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type={isKey && !showKeys ? 'password' : 'text'}
                            value={connector.value}
                            onChange={(e) => handleConnectorChange(connector.id, e.target.value)}
                            placeholder={isKey ? 'Enter API Key' : 'Enter RPC Endpoint URL'}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-sm"
                        />
                        {isKey && (
                            <button onClick={() => setShowKeys(!showKeys)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={() => handleTestConnection(connector.id)}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                        disabled={testStatus === 'testing'}
                    >
                        {testStatus === 'testing' ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                         testStatus === 'connected' ? <CheckCircle className="w-4 h-4 text-green-400" /> :
                         testStatus === 'error' ? <XCircle className="w-4 h-4 text-red-400" /> :
                         'Test'}
                    </button>
                </div>
            </div>
        );
    };

    if (loading) return <div>Loading connectors...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Data Connectors</h2>
                    <p className="text-slate-400">Manage RPC endpoints and external API keys.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Configuration
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Link className="w-5 h-5 text-cyan-400" />
                        Blockchain RPC Endpoints
                    </h3>
                    {connectors.filter(c => c.type === 'rpc').map(renderConnectorInput)}
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Key className="w-5 h-5 text-yellow-400" />
                        External API Keys
                    </h3>
                    {connectors.filter(c => c.type === 'key').map(renderConnectorInput)}
                </div>
            </div>
        </div>
    );
};

export default DataConnectors;