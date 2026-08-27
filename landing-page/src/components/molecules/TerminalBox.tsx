import React, { useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';

export const TerminalBox: React.FC = () => {
  const [lines, setLines] = useState<string[]>([]);
  
  const terminalSequence = [
    '$ curl -fsSL https://get.diama.dev/dbms.sh | sh',
    '✓ Aeris binary v1.0.0 installed to /usr/local/bin/aeris',
    '$ aeris serve --port 8080',
    '┌─────────────────────────────────────────────────────────┐',
    '│ 🚀 Project Aeris v1.0.0 (Go 1.22.6 + React Vite)       │',
    '│ 🔌 Storage: Pure Go SQLite (PRAGMA WAL enabled)         │',
    '│ 🌐 Web IDE: http://localhost:8080/                      │',
    '│ ⚡ Startup Time: 1.2ms | Memory Usage: 11.4MB           │',
    '└─────────────────────────────────────────────────────────┘',
    '[INFO] Server listening on 0.0.0.0:8080 (Press Ctrl+C to stop)'
  ];

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < terminalSequence.length) {
        const nextLine = terminalSequence[index];
        setLines(prev => [...prev, nextLine]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-dark-bg border-2 border-zinc-700 rounded-xl overflow-hidden shadow-neubrutalism font-mono text-xs md:text-sm">
      <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
          <Terminal className="w-3.5 h-3.5" />
          <span>aeris-terminal</span>
        </div>
      </div>
      <div className="p-4 space-y-1.5 min-h-[260px] text-zinc-300">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={
              line.startsWith('$')
                ? 'text-brand-accent font-semibold'
                : line.includes('🚀')
                ? 'text-brand-primary font-bold'
                : line.includes('✓')
                ? 'text-emerald-400'
                : 'text-zinc-400'
            }
          >
            {line}
          </div>
        ))}
        {lines.length < terminalSequence.length && (
          <span className="inline-block w-2 h-4 bg-brand-primary animate-pulse ml-1"></span>
        )}
      </div>
    </div>
  );
};