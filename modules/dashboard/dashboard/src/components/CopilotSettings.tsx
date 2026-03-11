import React from 'react';
import { X, Save, ShieldAlert, Brain, Zap } from 'lucide-react';

interface CopilotSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    autoPause: boolean;
    setAutoPause: (enabled: boolean) => void;
    threshold: number;
    setThreshold: (value: number) => void;
    onSave: () => void;
}

const CopilotSettings: React.FC<CopilotSettingsProps> = ({
    isOpen,
    onClose,
    autoPause,
    setAutoPause,
    threshold,
    setThreshold,
    onSave
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        Copilot Configuration
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Safety Stop */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                                <ShieldAlert className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="font-medium text-white">Automated Safety Stop</h3>
                                <p className="text-xs text-slate-400">Emergency halt triggers</p>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-300">Enable Auto-Pause</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={autoPause} 
                                        onChange={(e) => setAutoPause(e.target.checked)} 
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                </label>
                            </div>

                            <div className={`space-y-2 transition-opacity ${autoPause ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Confidence Threshold</span>
                                    <span className="text-red-400 font-mono">{threshold}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="50" 
                                    max="99" 
                                    value={threshold} 
                                    onChange={(e) => setThreshold(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                                />
                                <p className="text-xs text-slate-500">
                                    Trading will pause if AI confidence drops below this value.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Other AI Params */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Zap className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-medium text-white">Response Behavior</h3>
                                <p className="text-xs text-slate-400">Adjust AI interaction style</p>
                            </div>
                        </div>
                         <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <div className="flex items-center justify-between text-sm text-slate-300">
                                <span>Verbose Explanations</span>
                                <input type="checkbox" defaultChecked className="accent-purple-500" />
                            </div>
                         </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => { onSave(); onClose(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CopilotSettings;