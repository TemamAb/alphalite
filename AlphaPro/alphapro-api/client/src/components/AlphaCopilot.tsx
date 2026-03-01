import React, { useState } from 'react';
import { MessageSquare, Loader, AlertTriangle } from 'lucide-react';

export const AlphaCopilot: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAskCopilot = async () => {
    setIsLoading(true);
    setAnswer(null);
    setError(null);

    try {
      const response = await fetch(`/api/copilot?question=${encodeURIComponent(question)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAnswer(data.answer || 'No answer received.');
    } catch (e: any) {
      console.error("Copilot query failed:", e.message);
      setError(e.message);
      setAnswer(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
      <h3 className="text-sm font-bold text-slate-300 mb-3">Alpha-Copilot</h3>
      <div className="space-y-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about performance projections..."
          className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-xs font-mono h-20 focus:border-blue-500 outline-none"
        />

        <button
          onClick={handleAskCopilot}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MessageSquare className="w-3 h-3" />
          Ask Alpha-Copilot
          {isLoading && <Loader className="w-3 h-3 animate-spin" />}
        </button>

        {answer && (
          <div className="bg-slate-800/30 border border-slate-700 rounded p-3 text-xs text-slate-300 font-mono">
            {answer}
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded p-3 text-xs text-red-300 font-mono flex items-start gap-2">
            <AlertTriangle className="w-3 h-3" />
            <span>Error: {error}</span>
          </div>
        )}

      </div>
    </div>
  );
};

export default AlphaCopilot;