import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'bash' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden font-mono text-xs sm:text-sm">
      <div className="flex justify-between items-center px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800/80 text-xs">
        <span className="font-semibold uppercase tracking-wider text-indigo-400 text-[11px]">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border border-zinc-700/80 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-md transition-colors"
          aria-label="Copy code to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-zinc-100 whitespace-pre leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};