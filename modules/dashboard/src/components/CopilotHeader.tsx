import React from 'react';
import { Brain, Shield, Crosshair, Zap, Layout, Code, Wand2, Settings } from 'lucide-react';

interface CopilotHeaderProps {
    selectedPersona: string;
    selectedProvider: string;
    onProviderChange: (provider: string) => void;
    onOpenSettings: () => void;
}

const CopilotHeader: React.FC<CopilotHeaderProps> = ({
    selectedPersona,
    selectedProvider,
    onProviderChange,
    onOpenSettings
}) => {
    return (
        <div className="flex items-center gap-3 shrink-0">
            <div className={`p-3 bg-gradient-to-br rounded-xl shadow-lg ${
                selectedPersona === 'sentinel' ? 'from-green-500 to-emerald-700 shadow-green-500/20' :
                selectedPersona === 'sniper' ? 'from-red-500 to-orange-700 shadow-red-500/20' :
                selectedPersona === 'optimizer' ? 'from-yellow-500 to-amber-600 shadow-yellow-500/20' :
                selectedPersona === 'architect' ? 'from-cyan-500 to-blue-600 shadow-cyan-500/20' :
                selectedPersona === 'engineer' ? 'from-orange-500 to-red-600 shadow-orange-500/20' :
                selectedPersona === 'auto' ? 'from-slate-700 to-slate-900 shadow-slate-500/20' :
                'from-indigo-500 to-purple-600 shadow-purple-500/20'
            }`}>
                {selectedPersona === 'sentinel' ? <Shield className="w-8 h-8 text-white" /> :
                 selectedPersona === 'sniper' ? <Crosshair className="w-8 h-8 text-white" /> :
                 selectedPersona === 'optimizer' ? <Zap className="w-8 h-8 text-white" /> :
                 selectedPersona === 'architect' ? <Layout className="w-8 h-8 text-white" /> :
                 selectedPersona === 'engineer' ? <Code className="w-8 h-8 text-white" /> :
                 selectedPersona === 'auto' ? <Wand2 className="w-8 h-8 text-white" /> :
                 <Brain className="w-8 h-8 text-white" />}
            </div>
            <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Alpha Intelligence Core</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">OPERATIONAL // SYSTEM READY</p>
            </div>
            <div className="flex items-center gap-2 mr-2">
                <select 
                    value={selectedProvider}
                    onChange={(e) => onProviderChange(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                    <option value="openai">OpenAI GPT-4</option>
                    <option value="gemini">Gemini Assist</option>
                    <option value="gemini-studio">Gemini AI Studio</option>
                </select>
            </div>
            <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Copilot Settings"><Settings className="w-5 h-5" /></button>
        </div>
    );
};

export default CopilotHeader;