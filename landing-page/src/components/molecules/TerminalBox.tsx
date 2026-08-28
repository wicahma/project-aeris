import React, { useState, useEffect } from 'react';

export const TerminalBox: React.FC = () => {
  const [lines, setLines] = useState<string[]>([]);
  
  const terminalSequence = [
    '$ curl -fsSL https://get.diama.dev/dbms.sh | sh',
    '✓ Aeris binary v1.0.0 installed to /usr/local/bin/aeris',
    '$ aeris serve --port 8080 --data-dir ./data',
    '┌──────────────────────────────────────────────────────────┐',
    '│  Project Aeris v1.0.0 (Go 1.22.6 + React Vite)          │',
    '│  Storage Engine: Pure Go SQLite (PRAGMA WAL enabled)     │',
    '│  Web Console: http://localhost:8080/                      │',
    '│  Startup Latency: 1.2ms | RAM Usage: 11.4MB              │',
    '└──────────────────────────────────────────────────────────┘',
    '[INFO] REST & GraphQL APIs auto-generated for 5 tables',
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
    }, 350);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden font-mono text-xs md:text-sm shadow-xl">
      <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
        </div>
        <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
          aeris-terminal
        </div>
      </div>
      <div className="p-4 space-y-1.5 min-h-[280px] text-zinc-300">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={
              line.startsWith('$')
                ? 'text-emerald-400 font-semibold'
                : line.includes('Project Aeris')
                ? 'text-indigo-400 font-bold'
                : line.includes('✓')
                ? 'text-emerald-400'
                : 'text-zinc-400'
            }
          >
            {line}
          </div>
        ))}
        {lines.length < terminalSequence.length && (
          <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1"></span>
        )}
      </div>
    </div>
  );
};