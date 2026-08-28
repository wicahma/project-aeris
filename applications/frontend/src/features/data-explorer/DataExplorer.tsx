import React, { useState, useEffect } from 'react';
import { useAerisStore } from '../../shared/store/useAerisStore';
import { ApiClient } from '../../shared/api-client';
import { TableSchema } from '../../shared/types';
import {
  LayoutGrid,
  Search,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  FileCode2,
  Database,
  Table as TableIcon,
} from 'lucide-react';

export const DataExplorer: React.FC = () => {
  const { activeDatabase, schemas, selectedTableForExplorer, setSelectedTableForExplorer, addToast } = useAerisStore();

  const [tableData, setTableData] = useState<{ columns: string[]; rows: Record<string, any>[]; totalRows: number }>({
    columns: [],
    rows: [],
    totalRows: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC');

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colName: string; value: any } | null>(null);

  // New row modal state
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});

  const currentSchema = schemas.find((s) => s.name === selectedTableForExplorer);
  const pkColumn = currentSchema?.columns.find((c) => c.primaryKey)?.name || 'id';

  const loadData = async () => {
    if (!selectedTableForExplorer) return;
    setIsLoading(true);
    try {
      const res = await ApiClient.fetchTableData(
        selectedTableForExplorer,
        activeDatabase,
        filterText,
        sortCol || undefined,
        sortDir
      );
      setTableData(res);
    } catch (err) {
      addToast({ type: 'error', title: 'Data Load Failed' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTableForExplorer, activeDatabase, filterText, sortCol, sortDir]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortCol(col);
      setSortDir('ASC');
    }
  };

  const handleSaveCell = async (rowIdx: number, colName: string) => {
    if (!editingCell || !selectedTableForExplorer) return;
    const row = tableData.rows[rowIdx];
    const pkVal = row[pkColumn];

    try {
      await ApiClient.updateCell(
        selectedTableForExplorer,
        pkColumn,
        pkVal,
        colName,
        editingCell.value,
        activeDatabase
      );

      // Update local state instantly
      const updatedRows = [...tableData.rows];
      updatedRows[rowIdx][colName] = editingCell.value;
      setTableData({ ...tableData, rows: updatedRows });

      addToast({
        type: 'success',
        title: 'Cell Updated',
        message: `Updated ${colName} = "${editingCell.value}"`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Update Failed' });
    } finally {
      setEditingCell(null);
    }
  };

  const handleDeleteRow = async (row: Record<string, any>) => {
    if (!selectedTableForExplorer) return;
    const pkVal = row[pkColumn];
    if (!confirm(`Are you sure you want to delete row where ${pkColumn} = ${pkVal}?`)) return;

    try {
      await ApiClient.deleteRow(selectedTableForExplorer, pkColumn, pkVal, activeDatabase);
      await loadData();
      addToast({
        type: 'success',
        title: 'Row Deleted',
        message: `Removed row ${pkColumn} = ${pkVal}`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Delete Failed' });
    }
  };

  const handleAddRowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableForExplorer) return;
    try {
      await ApiClient.insertRow(selectedTableForExplorer, newRowData, activeDatabase);
      setShowAddRowModal(false);
      setNewRowData({});
      await loadData();
      addToast({
        type: 'success',
        title: 'Row Inserted',
        message: `New row added to ${selectedTableForExplorer}`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Insert Failed' });
    }
  };

  const exportCSV = () => {
    if (!tableData.rows.length) return;
    const headers = tableData.columns.join(',');
    const csvRows = tableData.rows.map((r) =>
      tableData.columns.map((c) => JSON.stringify(r[c] ?? '')).join(',')
    );
    const blob = new Blob([[headers, ...csvRows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTableForExplorer}_export_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b0f17]">
      {/* Top Toolbar */}
      <div className="h-14 bg-[#0d131f] border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-teal-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Table:</span>
            <select
              value={selectedTableForExplorer || ''}
              onChange={(e) => setSelectedTableForExplorer(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 text-teal-300 font-mono text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-teal-500 font-semibold"
            >
              {schemas.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.rowCount} rows)
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-5 bg-slate-800" />

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search table rows..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-teal-500 text-xs font-mono text-slate-200 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none w-56 placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setNewRowData({});
              setShowAddRowModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-md shadow-teal-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Add Row</span>
          </button>

          <button
            onClick={loadData}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition"
            title="Refresh Table Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
          </button>

          <button
            onClick={exportCSV}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-teal-300 rounded-lg border border-slate-800 transition"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Table View */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        {tableData.rows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <TableIcon className="w-12 h-12 text-slate-700 mb-3" />
            <h3 className="text-sm font-semibold text-slate-400">No Data Available</h3>
            <p className="text-xs font-mono text-slate-500 mt-1 max-w-xs">
              {filterText ? 'No records match search filter' : 'This table is currently empty. Click "Add Row" to insert data.'}
            </p>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-[#0d131f]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="px-3 py-2.5 w-12 text-center border-r border-slate-800/80">#</th>
                    {tableData.columns.map((col) => {
                      const colSchema = currentSchema?.columns.find((c) => c.name === col);
                      return (
                        <th
                          key={col}
                          onClick={() => handleSort(col)}
                          className="px-4 py-2.5 font-semibold text-teal-400 cursor-pointer hover:bg-slate-800/50 select-none border-r border-slate-800/80 last:border-r-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span>{col}</span>
                              {colSchema?.primaryKey && (
                                <span className="px-1 py-0.2 bg-amber-950 text-amber-300 border border-amber-800/60 rounded text-[9px]">
                                  PK
                                </span>
                              )}
                            </div>
                            <ArrowUpDown className="w-3 h-3 text-slate-600 hover:text-slate-300" />
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-3 py-2.5 w-16 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tableData.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-800/40 transition">
                      <td className="px-3 py-2 text-center text-slate-500 text-[10px] border-r border-slate-800/60">
                        {rowIdx + 1}
                      </td>
                      {tableData.columns.map((col) => {
                        const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.colName === col;
                        const cellVal = row[col];

                        return (
                          <td
                            key={col}
                            onDoubleClick={() => setEditingCell({ rowIdx, colName: col, value: cellVal })}
                            className="px-4 py-2 text-slate-200 border-r border-slate-800/60 last:border-r-0 relative group cursor-pointer"
                          >
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editingCell.value}
                                  onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveCell(rowIdx, col);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  className="w-full bg-slate-950 border border-teal-500 text-teal-200 px-2 py-0.5 rounded text-xs focus:outline-none font-mono"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveCell(rowIdx, col)}
                                  className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingCell(null)}
                                  className="p-1 text-rose-400 hover:bg-slate-800 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate">
                                  {cellVal === null ? (
                                    <span className="text-slate-600 italic">NULL</span>
                                  ) : typeof cellVal === 'boolean' ? (
                                    <span className={cellVal ? 'text-emerald-400' : 'text-rose-400'}>
                                      {String(cellVal)}
                                    </span>
                                  ) : (
                                    String(cellVal)
                                  )}
                                </span>
                                <Edit2 className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition shrink-0" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(row)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                          title="Delete Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats Bar */}
      <div className="h-10 bg-[#0d131f] border-t border-slate-800/80 px-4 flex items-center justify-between shrink-0 text-xs font-mono text-slate-400">
        <div>
          Showing {tableData.rows.length} of {tableData.totalRows} records in <span className="text-teal-300 font-semibold">{selectedTableForExplorer}</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Tip: Double click any cell to edit inline
        </div>
      </div>

      {/* Add Row Modal */}
      {showAddRowModal && currentSchema && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-700/80 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-100 text-base">
                Insert New Row into {selectedTableForExplorer}
              </h3>
              <button
                onClick={() => setShowAddRowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRowSubmit} className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar p-1">
              {currentSchema.columns.map((col) => (
                <div key={col.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-medium">
                      {col.name} <span className="text-teal-400">({col.type})</span>
                    </span>
                    {col.primaryKey && <span className="text-amber-400 text-[10px]">Auto Primary Key</span>}
                  </div>
                  <input
                    type="text"
                    placeholder={col.defaultValue ? `Default: ${col.defaultValue}` : 'Enter value...'}
                    value={newRowData[col.name] || ''}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, [col.name]: e.target.value })
                    }
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              ))}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRowModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold transition"
                >
                  Insert Row
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
