import React, { useState, useMemo } from 'react';
import { useAerisStore } from '../../shared/store/useAerisStore';
import { ColumnDef, TableSchema } from '../../shared/types';
import { ApiClient } from '../../shared/api-client';
import {
  TableProperties,
  Plus,
  Trash2,
  Play,
  Copy,
  Check,
  Key,
  Shield,
  Link,
  Code,
  Layers,
  Sparkles,
  Database,
  RefreshCw,
} from 'lucide-react';

export const SchemaBuilder: React.FC = () => {
  const { activeDatabase, schemas, loadSchemas, addToast, setActiveTab, setSelectedTableForExplorer } = useAerisStore();

  const [tableName, setTableName] = useState('new_table');
  const [columns, setColumns] = useState<ColumnDef[]>([
    { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
    { name: 'title', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
    { name: 'created_at', type: 'DATETIME', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
  ]);

  const [copied, setCopied] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedSchemaView, setSelectedSchemaView] = useState<TableSchema | null>(null);

  const addColumn = () => {
    setColumns([
      ...columns,
      {
        name: `col_${columns.length + 1}`,
        type: 'TEXT',
        primaryKey: false,
        nullable: true,
        unique: false,
      },
    ]);
  };

  const removeColumn = (index: number) => {
    if (columns.length <= 1) {
      addToast({ type: 'warning', title: 'Minimum 1 Column Required' });
      return;
    }
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, updates: Partial<ColumnDef>) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], ...updates };
    setColumns(updated);
  };

  // Generate DDL SQL Query
  const generatedDDL = useMemo(() => {
    const cleanTableName = tableName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || 'new_table';
    const colLines = columns.map((col) => {
      let line = `  ${col.name} ${col.type}`;
      if (col.primaryKey) line += ' PRIMARY KEY';
      if (!col.nullable && !col.primaryKey) line += ' NOT NULL';
      if (col.unique && !col.primaryKey) line += ' UNIQUE';
      if (col.defaultValue && col.defaultValue.trim()) line += ` DEFAULT ${col.defaultValue}`;
      if (col.references && col.references.table && col.references.column) {
        line += ` REFERENCES ${col.references.table}(${col.references.column})`;
        if (col.references.onDelete) line += ` ON DELETE ${col.references.onDelete}`;
      }
      return line;
    });

    return `CREATE TABLE IF NOT EXISTS ${cleanTableName} (\n${colLines.join(',\n')}\n);`;
  }, [tableName, columns]);

  const handleExecuteDDL = async () => {
    if (!tableName.trim()) return;
    setIsExecuting(true);
    try {
      await ApiClient.executeQuery(generatedDDL, activeDatabase);
      await loadSchemas();
      addToast({
        type: 'success',
        title: 'Table Created',
        message: `Successfully executed DDL for ${tableName} in ${activeDatabase}`,
      });
      setSelectedTableForExplorer(tableName);
      setActiveTab('data-explorer');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'DDL Execution Error',
        message: err?.message || 'Failed to create table',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const copyDDL = () => {
    navigator.clipboard.writeText(generatedDDL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#0b0f17]">
      {/* Left Column: Visual Builder */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800/80 overflow-y-auto custom-scrollbar p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <TableProperties className="w-5 h-5 text-teal-400" />
              Visual Schema Builder
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Design tables, data types, constraints, and foreign key relations visually.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyDDL}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy DDL'}</span>
            </button>

            <button
              onClick={handleExecuteDDL}
              disabled={isExecuting || !tableName.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/10"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isExecuting ? 'Creating...' : 'Execute DDL'}</span>
            </button>
          </div>
        </div>

        {/* Table Name Input */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Table Name
          </label>
          <input
            type="text"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="e.g. customers"
            className="w-full max-w-md px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Columns Builder Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Columns & Constraints ({columns.length})
            </h3>
            <button
              onClick={addColumn}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded-lg hover:bg-teal-500/20 transition font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add Column
            </button>
          </div>

          <div className="space-y-3">
            {columns.map((col, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#0d131f] border border-slate-800 rounded-xl space-y-3 transition hover:border-slate-700"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Column Name */}
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={col.name}
                      onChange={(e) => updateColumn(idx, { name: e.target.value })}
                      placeholder="column_name"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* Type Selector */}
                  <div className="md:col-span-3">
                    <select
                      value={col.type}
                      onChange={(e) =>
                        updateColumn(idx, { type: e.target.value as ColumnDef['type'] })
                      }
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-teal-300 focus:outline-none focus:border-teal-500"
                    >
                      <option value="INTEGER">INTEGER</option>
                      <option value="TEXT">TEXT</option>
                      <option value="REAL">REAL</option>
                      <option value="BLOB">BLOB</option>
                      <option value="BOOLEAN">BOOLEAN</option>
                      <option value="DATETIME">DATETIME</option>
                    </select>
                  </div>

                  {/* Constraints Checkboxes */}
                  <div className="md:col-span-5 flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer" title="Primary Key">
                      <input
                        type="checkbox"
                        checked={col.primaryKey}
                        onChange={(e) => updateColumn(idx, { primaryKey: e.target.checked })}
                        className="rounded border-slate-700 text-teal-500 focus:ring-teal-500 w-3.5 h-3.5"
                      />
                      <span className="font-mono text-[11px] text-slate-300">PK</span>
                    </label>

                    <label className="flex items-center gap-1 cursor-pointer" title="Nullable">
                      <input
                        type="checkbox"
                        checked={col.nullable}
                        onChange={(e) => updateColumn(idx, { nullable: e.target.checked })}
                        className="rounded border-slate-700 text-teal-500 focus:ring-teal-500 w-3.5 h-3.5"
                      />
                      <span className="font-mono text-[11px] text-slate-300">NULL</span>
                    </label>

                    <label className="flex items-center gap-1 cursor-pointer" title="Unique">
                      <input
                        type="checkbox"
                        checked={col.unique}
                        onChange={(e) => updateColumn(idx, { unique: e.target.checked })}
                        className="rounded border-slate-700 text-teal-500 focus:ring-teal-500 w-3.5 h-3.5"
                      />
                      <span className="font-mono text-[11px] text-slate-300">UNIQUE</span>
                    </label>

                    {/* Default value */}
                    <input
                      type="text"
                      value={col.defaultValue || ''}
                      onChange={(e) => updateColumn(idx, { defaultValue: e.target.value })}
                      placeholder="Default"
                      className="w-24 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] font-mono text-slate-300 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* Remove Column */}
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      onClick={() => removeColumn(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-900 transition"
                      title="Delete Column"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Foreign Key Relations config */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 text-[11px] font-mono">
                  <Link className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">FK Reference:</span>
                  <select
                    value={col.references?.table || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        updateColumn(idx, { references: undefined });
                      } else {
                        updateColumn(idx, {
                          references: { table: val, column: 'id', onDelete: 'CASCADE' },
                        });
                      }
                    }}
                    className="bg-slate-950 border border-slate-800 text-slate-200 px-2 py-0.5 rounded"
                  >
                    <option value="">None</option>
                    {schemas.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  {col.references?.table && (
                    <>
                      <span className="text-slate-500">→</span>
                      <input
                        type="text"
                        value={col.references.column}
                        onChange={(e) =>
                          updateColumn(idx, {
                            references: { ...col.references!, column: e.target.value },
                          })
                        }
                        placeholder="target_col"
                        className="w-20 px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-200"
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Real-time DDL SQL Preview & Existing Schemas */}
      <div className="w-96 bg-[#0d131f] flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-6 space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-2">
            <Code className="w-4 h-4 text-teal-400" /> Real-time DDL SQL Preview
          </h3>
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto shadow-inner">
            <pre className="text-xs font-mono text-teal-300 whitespace-pre-wrap">{generatedDDL}</pre>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" /> Database Schemas ({schemas.length})
            </h3>
            <button
              onClick={loadSchemas}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {schemas.map((s) => (
              <div
                key={s.name}
                onClick={() => setSelectedSchemaView(s)}
                className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl hover:border-teal-500/40 cursor-pointer transition space-y-2"
              >
                <div className="flex items-center justify-between font-mono text-xs font-semibold text-slate-200">
                  <span>{s.name}</span>
                  <span className="text-[10px] text-slate-500">{s.rowCount} rows</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {s.columns.map((c) => (
                    <span
                      key={c.name}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                        c.primaryKey
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {c.name}: {c.type}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
