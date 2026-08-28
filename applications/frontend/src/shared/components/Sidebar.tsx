import React, { useState } from 'react';
import { useAerisStore } from '../store/useAerisStore';
import { Table, Search, Plus, Key, ChevronRight, Layers, FileCode } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { schemas, selectedTableForExplorer, setSelectedTableForExplorer, setActiveTab, activeDatabase } = useAerisStore();
  const [filter, setFilter] = useState('');

  const filteredSchemas = schemas.filter((s) =>
    s.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <aside className="w-64 bg-[#0d131f] border-r border-slate-800/80 flex flex-col shrink-0 select-none overflow-hidden">
      {/* Database Tables Header */}
      <div className="p-3 border-b border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">
              TABLES ({schemas.length})
            </span>
          </div>
          <button
            onClick={() => setActiveTab('schema-builder')}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-teal-300 rounded transition"
            title="Create New Table"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Tables */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter tables..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 focus:border-teal-500/50 text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none placeholder:text-slate-600 font-mono"
          />
        </div>
      </div>

      {/* Table list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {filteredSchemas.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 font-mono">
            {filter ? 'No tables match query' : 'No tables in database'}
          </div>
        ) : (
          filteredSchemas.map((schema) => {
            const isSelected = selectedTableForExplorer === schema.name;
            const pkColumn = schema.columns.find((c) => c.primaryKey)?.name;

            return (
              <div
                key={schema.name}
                onClick={() => {
                  setSelectedTableForExplorer(schema.name);
                  setActiveTab('data-explorer');
                }}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${
                  isSelected
                    ? 'bg-teal-500/10 text-teal-300 font-medium border border-teal-500/30'
                    : 'hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Table className={`w-4 h-4 shrink-0 ${isSelected ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <div className="truncate">
                    <div className="font-mono text-xs truncate leading-tight">{schema.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>{schema.columns.length} cols</span>
                      <span>•</span>
                      <span>{schema.rowCount.toLocaleString()} rows</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTableForExplorer(schema.name);
                      setActiveTab('data-explorer');
                    }}
                    className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded"
                    title="Explore Data"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-900/60 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileCode className="w-3.5 h-3.5 text-teal-400" />
          <span>Active: {activeDatabase}</span>
        </div>
      </div>
    </aside>
  );
};
