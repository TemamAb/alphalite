import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeEditorProps {
  code: string;
  language?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, language = 'javascript' }) => {
  return (
    <div className="my-4 rounded-lg overflow-hidden bg-[#1e1e1e] border border-slate-700">
      <div className="px-4 py-2 bg-slate-800 text-xs text-slate-400 font-mono">
        {language}
      </div>
      <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', maxHeight: '400px' }}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeEditor;