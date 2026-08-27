import React, { useState } from 'react';
import { Play, Sparkles, Table, Database, Layers, CheckCircle2 } from 'lucide-react';

export const MockupShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'editor' | 'data'>('editor');

  const mockData = [
    { id: 1, name: 'Alice Smith', email: 'alice@diama.dev', role: 'admin', status: 'active', created_at: '2026-08-28 06:12:00' },
    { id: 2, name: 'Bob Jones', email: 'bob@diama.dev', role: 'developer', status: 'active', created_at: '2026-08-28 06:14:22' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@diama.dev', role: 'analyst', status: 'inactive', created_at: '2026-08-28 06:15:45' }
  ];

  return (
    <section id="demo" className="py-20 border-b border-dark-border bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <h2 className="text-xs font-mono font-bold tracking-widest text-brand-accent uppercase">
            Interactive Interface Showcase
          </h2>
          <p className="text-3xl font-black font-sans text-white">
            Clean, IDE-Grade Web Console.
          </p>
          <p className="text-sm text-dark-muted">
            Inspect schema, run complex SQL queries, and edit records in real time.
          </p>
        </div>

        <div className="bg-dark-bg border-2 border-zinc-700 rounded-xl overflow-hidden shadow-neubrutalism">
          <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="font-mono text-xs font-bold text-brand-primary flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                <span>aeris://production.db</span>
              </span>
              <span className="text-zinc-600">|</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`px-3 py-1 text-xs font-mono rounded ${activeTab === 'editor' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'}`}
                >
                  query_users.sql
                </button>
                <button
                  onClick={() => setActiveTab('data')}
                  className={`px-3 py-1 text-xs font-mono rounded ${activeTab === 'data' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Table: users
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> 1.2ms
              </span>
            </div>
          </div>

          <div className="grid grid-cols-12 min-h-[380px]">
            <div className="col-span-3 bg-zinc-900/50 p-4 border-r border-zinc-800 font-mono text-xs text-zinc-400 space-y-3">
              <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-primary" />
                <span>SCHEMAS</span>
              </div>
              <div className="pl-2 space-y-1.5">
                <div className="text-brand-accent font-medium flex items-center gap-1">
                  <Table className="w-3.5 h-3.5" /> users (5 cols)
                </div>
                <div className="hover:text-zinc-200 cursor-pointer pl-4">├─ id (INT PK)</div>
                <div className="hover:text-zinc-200 cursor-pointer pl-4">├─ name (TEXT)</div>
                <div className="hover:text-zinc-200 cursor-pointer pl-4">├─ email (TEXT)</div>
                <div className="hover:text-zinc-200 cursor-pointer pl-4">└─ status (TEXT)</div>
                <div className="text-zinc-400 font-medium flex items-center gap-1 pt-2">
                  <Table className="w-3.5 h-3.5" /> orders (4 cols)
                </div>
                <div className="text-zinc-400 font-medium flex items-center gap-1 pt-1">
                  <Table className="w-3.5 h-3.5" /> logs (3 cols)
                </div>
              </div>
            </div>

            <div className="col-span-9 p-4 flex flex-col justify-between font-mono">
              {activeTab === 'editor' ? (
                <div className="space-y-4">
                  <div className="bg-zinc-900 p-4 rounded border border-zinc-800 space-y-1 text-sm">
                    <div className="text-purple-400 font-semibold">
                      SELECT <span className="text-white">id, name, email, role, status, created_at</span>
                    </div>
                    <div className="text-purple-400 font-semibold">
                      FROM <span className="text-emerald-400">users</span>
                    </div>
                    <div className="text-purple-400 font-semibold">
                      WHERE <span className="text-white">status = </span><span className="text-amber-300">'active'</span>
                    </div>
                    <div className="text-purple-400 font-semibold">
                      ORDER BY <span className="text-white">created_at DESC;</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1.5 bg-brand-primary text-white text-xs px-3 py-1.5 rounded font-bold shadow-sm hover:bg-brand-primary/90">
                        <Play className="w-3.5 h-3.5 fill-current" /> Execute (Cmd+Enter)
                      </button>
                      <button className="flex items-center gap-1 text-zinc-300 text-xs px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700">
                        <Sparkles className="w-3.5 h-3.5 text-brand-accent" /> Format
                      </button>
                    </div>
                    <span className="text-xs text-zinc-400">3 rows returned</span>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 border border-zinc-800 rounded overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900 text-zinc-300 border-b border-zinc-800">
                    <tr>
                      <th className="py-2 px-3">id</th>
                      <th className="py-2 px-3">name</th>
                      <th className="py-2 px-3">email</th>
                      <th className="py-2 px-3">role</th>
                      <th className="py-2 px-3">status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-200">
                    {mockData.map(row => (
                      <tr key={row.id} className="hover:bg-zinc-900/50">
                        <td className="py-2 px-3 font-semibold text-brand-primary">{row.id}</td>
                        <td className="py-2 px-3">{row.name}</td>
                        <td className="py-2 px-3 text-zinc-400">{row.email}</td>
                        <td className="py-2 px-3">{row.role}</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${row.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};