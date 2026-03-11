import React from 'react';
import { Wand2, Brain, Shield, Crosshair, Zap, Layout, Code } from 'lucide-react';

interface PersonaSelectorProps {
    selectedPersona: string;
    onSelect: (persona: string) => void;
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({ selectedPersona, onSelect }) => {
    const personas = [
        { id: 'auto', label: 'Auto', icon: Wand2, activeClass: 'bg-slate-800 border-slate-600 text-white' },
        { id: 'strategist', label: 'Strategist', icon: Brain, activeClass: 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 text-purple-600 dark:text-purple-400' },
        { id: 'sentinel', label: 'Sentinel', icon: Shield, activeClass: 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-600 dark:text-green-400' },
        { id: 'sniper', label: 'Sniper', icon: Crosshair, activeClass: 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400' },
        { id: 'optimizer', label: 'Optimizer', icon: Zap, activeClass: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-600 dark:text-yellow-400' },
        { id: 'architect', label: 'Architect', icon: Layout, activeClass: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500 text-cyan-600 dark:text-cyan-400' },
        { id: 'engineer', label: 'Engineer', icon: Code, activeClass: 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-600 dark:text-orange-400' },
    ];

    return (
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2 shrink-0">
            {personas.map((p) => (
                <button
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                        selectedPersona === p.id 
                            ? p.activeClass 
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'
                    }`}
                >
                    <p.icon className="w-5 h-5" />
                    <span className="font-bold text-xs">{p.label}</span>
                </button>
            ))}
        </div>
    );
};

export default PersonaSelector;