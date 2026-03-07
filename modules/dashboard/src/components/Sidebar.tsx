import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
    const location = useLocation();
    
    const isActive = (path: string) => {
        return location.pathname === path 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
            : 'text-gray-400 hover:bg-gray-800 hover:text-white';
    };

    const navItems = [
        { path: '/', icon: '📊', label: 'Dashboard' },
        { path: '/rankings', icon: '🏆', label: 'Rankings' },
        { path: '/strategies', icon: '♟️', label: 'Strategies' },
        { path: '/copilot', icon: '🤖', label: 'Alpha Copilot' },
        { path: '/logs', icon: '📜', label: 'Persona Logs' },
        { path: '/wallets', icon: '💼', label: 'Wallets' },
        { path: '/settings', icon: '⚙️', label: 'Settings' },
        { path: '/ai-optimizer', icon: '🧠', label: 'AI Optimizer' }
    ];

    return (
        <div className="h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col fixed left-0 top-0 z-50">
            {/* Logo Area */}
            <div className="p-6 border-b border-gray-800 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3 flex items-center justify-center text-white font-bold">
                    A
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">AlphaPro</h1>
                    <p className="text-xs text-gray-500 font-mono">ENTERPRISE v1.0</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 mt-2 px-2">
                    Main Menu
                </div>
                
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive(item.path)}`}
                    >
                        <span className="mr-3 text-lg">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            {/* Status Footer */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                <div className="flex items-center px-4 py-3 bg-gray-800 rounded-xl border border-gray-700">
                    <div className="relative">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <div className="absolute top-0 left-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
                    </div>
                    <div className="ml-3">
                        <p className="text-xs text-gray-400">System Status</p>
                        <p className="text-sm font-bold text-green-400">OPERATIONAL</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;