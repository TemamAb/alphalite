import React, { useState, useEffect } from 'react';
import { Brain, Shield, Crosshair, Zap, Layout, Code, Fish, AlertTriangle } from 'lucide-react';

interface TradingSettings {
    reinvestmentRate: number;
    capitalVelocity: number;
}

interface PersonaConfig {
    aggression: number;
    riskTolerance: number;
}

interface PersonasSettings {
    strategist: PersonaConfig;
    sentinel: PersonaConfig;
    sniper: PersonaConfig;
}

interface FrontRunConfig {
    enabled: boolean;
    aggression: number;
    minWhaleValue: number;
}

const Settings: React.FC = () => {
    const [settings, setSettings] = useState<TradingSettings>({
        reinvestmentRate: 50,
        capitalVelocity: 100
    });
    const [personaSettings, setPersonaSettings] = useState<PersonasSettings>({
        strategist: { aggression: 50, riskTolerance: 50 },
        sentinel: { aggression: 20, riskTolerance: 10 },
        sniper: { aggression: 80, riskTolerance: 60 }
    });
    const [frontRunConfig, setFrontRunConfig] = useState<FrontRunConfig>({
        enabled: true,
        aggression: 50,
        minWhaleValue: 1000000
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Use environment variable or default to localhost
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    useEffect(() => {
        fetchSettings();
        fetchPersonaSettings();
        fetchFrontRunSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const response = await fetch(`${API_URL}/api/settings/trading`, {
                headers: headers as HeadersInit
            });
            
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            } else if (response.status === 401) {
                setMessage({ type: 'error', text: 'Session expired. Please login again.' });
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
            setMessage({ type: 'error', text: 'Failed to load settings from server.' });
        } finally {
            setLoading(false);
        }
    };

    const fetchPersonaSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const response = await fetch(`${API_URL}/api/settings/personas`, {
                headers: headers as HeadersInit
            });
            
            if (response.ok) {
                const data = await response.json();
                setPersonaSettings(data);
            }
        } catch (error) {
            console.error('Failed to fetch persona settings', error);
        }
    };

    const fetchFrontRunSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const response = await fetch(`${API_URL}/api/settings/frontrun`, {
                headers: headers as HeadersInit
            });
            
            if (response.ok) {
                const data = await response.json();
                setFrontRunConfig(data);
            }
        } catch (error) {
            console.error('Failed to fetch front-run settings', error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            // Save all settings in parallel
            const [tradingRes, personaRes, frontRunRes] = await Promise.all([
                fetch(`${API_URL}/api/settings/trading`, {
                    method: 'POST',
                    headers: headers as HeadersInit,
                    body: JSON.stringify(settings)
                }),
                fetch(`${API_URL}/api/settings/personas`, {
                    method: 'POST',
                    headers: headers as HeadersInit,
                    body: JSON.stringify(personaSettings)
                }),
                fetch(`${API_URL}/api/settings/frontrun`, {
                    method: 'POST',
                    headers: headers as HeadersInit,
                    body: JSON.stringify(frontRunConfig)
                })
            ]);

            if (tradingRes.ok && personaRes.ok && frontRunRes.ok) {
                setMessage({ type: 'success', text: 'Configuration saved successfully.' });
            } else {
                setMessage({ type: 'error', text: 'Failed to save configuration.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error saving settings.' });
        } finally {
            setSaving(false);
        }
    };

    const renderPersonaCard = (
        key: keyof PersonasSettings, 
        title: string, 
        icon: React.ReactNode, 
        colorClass: string
    ) => (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className={`flex items-center gap-2 mb-4 font-bold ${colorClass}`}>
                {icon} {title}
            </div>
            
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-500">
                        <span>Aggression</span>
                        <span>{personaSettings[key].aggression}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={personaSettings[key].aggression} onChange={(e) => setPersonaSettings({...personaSettings, [key]: { ...personaSettings[key], aggression: parseInt(e.target.value) }})} className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-${colorClass.split('-')[1]}-500`} />
                </div>
                
                <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-500">
                        <span>Risk Tolerance</span>
                        <span>{personaSettings[key].riskTolerance}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={personaSettings[key].riskTolerance} onChange={(e) => setPersonaSettings({...personaSettings, [key]: { ...personaSettings[key], riskTolerance: parseInt(e.target.value) }})} className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-${colorClass.split('-')[1]}-500`} />
                </div>
            </div>
        </div>
    );

    const renderFrontRunConfig = () => (
        <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Fish className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Whale Strategy (Front-Running)</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${frontRunConfig.enabled ? 'text-green-500' : 'text-gray-500'}`}>
                        {frontRunConfig.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={frontRunConfig.enabled} onChange={(e) => setFrontRunConfig({...frontRunConfig, enabled: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>

            <div className={`space-y-6 transition-opacity duration-300 ${frontRunConfig.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Aggression Level</label>
                        <span className="text-sm font-bold text-blue-600">{frontRunConfig.aggression}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={frontRunConfig.aggression} onChange={(e) => setFrontRunConfig({...frontRunConfig, aggression: parseInt(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600" />
                    <p className="mt-1 text-xs text-gray-500">Higher aggression increases gas bribes to ensure front-running success.</p>
                </div>

                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Whale Value</label>
                        <span className="text-sm font-bold text-green-600">${(frontRunConfig.minWhaleValue / 1000000).toFixed(1)}M</span>
                    </div>
                    <input type="range" min="100000" max="10000000" step="100000" value={frontRunConfig.minWhaleValue} onChange={(e) => setFrontRunConfig({...frontRunConfig, minWhaleValue: parseInt(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-green-600" />
                    <p className="mt-1 text-xs text-gray-500">Minimum transaction value to trigger a sandwich attack.</p>
                </div>
            </div>
        </div>
    );

    if (loading) return <div className="p-6 text-gray-500">Loading configuration...</div>;

    return (
        <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center">
                <span className="mr-2">⚙️</span> Trading Configuration
            </h2>
            
            {/* Profit Reinvestment Slider */}
            <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex justify-between mb-4">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        Profit Reinvestment Rate
                    </label>
                    <span className="text-lg font-bold text-blue-600">{settings.reinvestmentRate}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={settings.reinvestmentRate}
                    onChange={(e) => setSettings({...settings, reinvestmentRate: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Percentage of net profits to automatically reinvest into the trading pool.</p>
            </div>

            {/* Capital Velocity Slider */}
            <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex justify-between mb-4">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        Capital Velocity (Flash Loan Limit)
                    </label>
                    <span className="text-lg font-bold text-purple-600">${settings.capitalVelocity}M</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="500"
                    step="1"
                    value={settings.capitalVelocity}
                    onChange={(e) => setSettings({...settings, capitalVelocity: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-600"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Maximum capital utilization per trade execution block ($1M - $500M).</p>
            </div>

            {/* FrontRun Config Panel */}
            {renderFrontRunConfig()}

            {/* AI Persona Configuration */}
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">AI Persona Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {renderPersonaCard('strategist', 'Strategist', <Brain className="w-5 h-5" />, 'text-purple-500')}
                {renderPersonaCard('sentinel', 'Sentinel', <Shield className="w-5 h-5" />, 'text-green-500')}
                {renderPersonaCard('sniper', 'Sniper', <Crosshair className="w-5 h-5" />, 'text-red-500')}
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-6 py-2.5 text-white font-medium rounded-lg transition-colors ${
                        saving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30'
                    }`}
                >
                    {saving ? 'Saving Changes...' : 'Save Configuration'}
                </button>

                {/* Status Message */}
                {message.text && (
                    <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        message.type === 'success' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;