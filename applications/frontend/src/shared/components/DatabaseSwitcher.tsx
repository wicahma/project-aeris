import React, { useState } from 'react';
import { useAerisStore } from '../store/useAerisStore';
import { Database, Plus, Check, Server, Zap, HardDrive, MemoryStick } from 'lucide-react';

export const DatabaseSwitcher: React.FC = () => {
  const { databases, activeDatabase, setActiveDatabase, createDatabase } = useAerisStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [isInMemory, setIsInMemory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeDbInfo = databases.find((d) => d.name === activeDatabase);

  const handleSelect = async (dbName: string) => {
    setIsOpen(false);
    if (dbName !== activeDatabase) {
      await setActiveDatabase(dbName);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDbName.trim()) return;
    setIsSubmitting(true);
    try {
      await createDatabase(newDbName, isInMemory);
      setNewDbName('');
      setShowNewModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Active Database Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-teal-500/50 hover:bg-slate-800 text-slate-200 text-xs font-medium transition group"
      >
        <div className="p-1 rounded bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20">
          {activeDbInfo?.isInMemory ? <MemoryStick className="w-3.5 h-3.5 text-amber-400" /> : <Database className="w-3.5 h-3.5" />}
        </div>
        <div className="flex flex-col items-start leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-100">{activeDatabase}</span>
            {activeDbInfo?.walMode && (
              <span className="px-1 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[9px] font-mono">
                WAL
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            {activeDbInfo ? `${activeDbInfo.size} • ${activeDbInfo.tableCount} tables` : 'SQLite Active'}
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-72 z-50 bg-[#0d131f] border border-slate-700/80 rounded-xl shadow-2xl p-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2.5 py-2 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Hot-Swap SQLite Engine (.db)
              </span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowNewModal(true);
                }}
                className="flex items-center gap-1 px-2 py-1 text-[11px] bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 border border-teal-500/30 rounded font-medium transition"
              >
                <Plus className="w-3 h-3" /> New .db
              </button>
            </div>

            <div className="py-1 max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
              {databases.map((db) => {
                const isActive = db.name === activeDatabase;
                return (
                  <button
                    key={db.name}
                    onClick={() => handleSelect(db.name)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition ${
                      isActive
                        ? 'bg-teal-500/10 text-teal-200 font-medium border border-teal-500/30'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {db.isInMemory ? (
                        <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <HardDrive className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-mono text-xs font-semibold">{db.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {db.size} • {db.tableCount} tables
                        </div>
                      </div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-teal-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* New Database Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-700/80 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-teal-400" />
                <h3 className="font-semibold text-slate-100 text-base">Create SQLite Database</h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Database File Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. ecommerce.db"
                  value={newDbName}
                  onChange={(e) => setNewDbName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-teal-500 font-mono"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Extension .db will be automatically appended if omitted.
                </p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <input
                  type="checkbox"
                  id="inMemory"
                  checked={isInMemory}
                  onChange={(e) => setIsInMemory(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="inMemory" className="text-xs cursor-pointer select-none">
                  <span className="font-semibold text-slate-200 block">Ephemeral In-Memory Mode</span>
                  <span className="text-slate-400 text-[11px]">
                    Fast volatile storage in RAM. Data resets on engine restart.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newDbName.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Initializing...' : 'Create Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
