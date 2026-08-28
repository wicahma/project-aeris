import React, { useState } from 'react';
import { Play, Sparkles, Table, Database, Layers, CheckCircle2, Activity } from 'lucide-react';

export const MockupShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'editor' | 'data' | 'explain'>('editor');

  const mockData = [
    { id: 1, name: 'Alice Smith', email: 'alice@diama.dev', role: 'admin', status: 'active', created_at: '2026-08-28 06:12:00' },
    { id: 2, name: 'Bob Jones', email: 'bob@diama.dev', role: 'developer', status: 'active', created_at: '2026-08-28 06:14:22' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@diama.dev', role: 'analyst', status: 'inactive', created_at: '2026-08-28 06:15:45' }
  ];

  return (
    <section id="demo" className="py-20 md:py-28 border-b border-zinc-800/80 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <h2 className="text-xs font-mono font-semibold tracking-widest text-emerald-400 uppercase">
            Interactive Interface Showcase
          </h2>
          <p className="text-3xl sm:text-4xl font-bold font-display text-white tracking-tight">
            Clean, IDE-Grade Web Console.
          </p>
          <p className="text-sm text-zinc-400">
            Inspect schema, run complex SQL queries, and visualize execution plans in real time.
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3 overflow-x-auto">
              <span className="font-mono text-xs font-semibold text-indigo-400 flex items-center gap-1.5 shrink-0">
                <Database className="w-4 h-4" />
                <span>aeris://production.db</span>
              </span>
              <span className="text-zinc-700 hidden sm:inline">|</span>
              <div className="flex space-x-1 shrink-0">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${activeTab === 'editor' ? 'bg-zinc-800 text-white font-semibold border border-zinc-700' : 'text-zinc-400 hover:text-white'}`}
                >
                  query_users.sql
                </button>
                <button
                  onClick={() => setActiveTab('data')}
                  className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${activeTab === 'data' ? 'bg-zinc-800 text-white font-semibold border border-zinc-700' : 'text-zinc-400 hover:text-white'}`}
                >
                  Data Grid
                </button>
                <button
                  onClick={() => setActiveTab('explain')}
                  className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${activeTab === 'explain' ? 'bg-zinc-800 text-white font-semibold border border-zinc-700' : 'text-zinc-400 hover:text-white'}`}
                >
                  Explain Plan
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> 1.2ms
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
            <div className="lg:col-span-3 bg-zinc-950/60 p-4 border-b lg:border-b-0 lg:border-r border-zinc-800/80 font-mono text-xs text-zinc-400 space-y-3">
              <div className="font-semibold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Schemas</span>
              </div>
              <div className="pl-2 space-y-1.5">
                <div className="text-emerald-400 font-medium flex items-center gap-1">
                  <Table className="w-3.5 h-3.5" /> users (5 cols)
                </div>
                <div className="hover:text-zinc-200 cursor-pointer pl-4">├─ id (INT PK)</div>
                <div className="hover:text-zinc-200 cursor-pointer pl-4">├─ name (TEXT)</div>
                <div className="hover:text-zinc-200 cursor-pointer pl-4">├─ email (TEXT)</div>
                <div className="hover:text-zinc-200 cursor-pointer pl-4">└─ status (TEXT)</div>
                <div className="text-zinc-400 font-medium flex items-center gap-1 pt-2">
                  <Table className="w-3.5 h-3.5" /> orders (4 cols)
                </div>
              </div>
            </div>

            <div className="lg:col-span-9 p-4 flex flex-col justify-between font-mono">
              {activeTab === 'editor' && (
                <div className="space-y-4">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1 text-xs sm:text-sm">
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

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs px-3.5 py-1.5 rounded-lg font-medium shadow-sm hover:bg-indigo-500 transition-colors">
                        <Play className="w-3.5 h-3.5 fill-current" /> Execute (Cmd+Enter)
                      </button>
                      <button className="flex items-center gap-1 text-zinc-300 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Format
                      </button>
                    </div>
                    <span className="text-xs text-zinc-400">3 rows returned</span>
                  </div>
                </div>
              )}

              {activeTab === 'explain' && (
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold uppercase tracking-wider">
                    <Activity className="w-4 h-4" />
                    <span>Explain Plan Tree Visualizer</span>
                  </div>
                  <div className="space-y-1 text-zinc-300 font-mono">
                    <div className="text-emerald-400">└─ SEARCH TABLE users USING INDEX idx_users_status (status=?)</div>
                    <div className="text-zinc-500 pl-4">├─ Scan Cost: 0.04 ms</div>
                    <div className="text-zinc-500 pl-4">└─ Estimated Rows: 3</div>
                  </div>
                </div>
              )}

              <div className="mt-4 border border-zinc-800 rounded-xl overflow-x-auto bg-zinc-950">
                <table className="w-full text-left text-xs font-mono min-w-[500px]">
                  <thead className="bg-zinc-900/80 text-zinc-300 border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">id</th>
                      <th className="py-2.5 px-3">name</th>
                      <th className="py-2.5 px-3">email</th>
                      <th className="py-2.5 px-3">role</th>
                      <th className="py-2.5 px-3">status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 text-zinc-200">
                    {mockData.map(row => (
                      <tr key={row.id} className="hover:bg-zinc-900/50">
                        <td className="py-2.5 px-3 font-semibold text-indigo-400">{row.id}</td>
                        <td className="py-2.5 px-3">{row.name}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{row.email}</td>
                        <td className="py-2.5 px-3">{row.role}</td>
                        <td className="py-2.5 px-3">
                          {row.status === 'active' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                              {row.status}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800">
                              {row.status}
                            </span>
                          )}
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