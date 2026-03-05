import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsiblePanelProps {
  title: string;
  tooltip?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export default function CollapsiblePanel({ 
  title, 
  tooltip, 
  children, 
  defaultExpanded = true 
}: CollapsiblePanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-sm font-medium text-slate-200 font-mono">{title}</span>
        </div>
        {tooltip && (
          <span className="text-xs text-slate-500 hidden md:inline">{tooltip}</span>
        )}
      </button>
      
      {isExpanded && (
        <div className="border-t border-slate-700/30">
          {children}
        </div>
      )}
    </div>
  );
}
