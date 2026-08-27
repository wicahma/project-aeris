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
    <div className="relative bg-zinc-950 border-2 border-zinc-700 p-4 font-mono text-xs sm:text-sm shadow-[4px_4px_0px_0px_#27272a] overflow-x-auto">
      <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-zinc-800 text-xs text-zinc-400">
        <span className="font-bold uppercase tracking-wider text-indigo-400">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 font-bold text-[11px] border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors uppercase"
          aria-label="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="text-zinc-100 whitespace-pre leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};