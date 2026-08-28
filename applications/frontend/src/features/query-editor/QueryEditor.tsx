import React, { useState, useMemo, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, SQLDialect } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { useAerisStore } from '../../shared/store/useAerisStore';
import { ApiClient } from '../../shared/api-client';
import { QueryResult } from '../../shared/types';
import {
  Play,
  Clock,
  Download,
  History,
  Trash2,
  Sparkles,
  Copy,
  Check,
  FileSpreadsheet,
  FileCode2,
  Table as TableIcon,
  AlertCircle,
  Database,
  ChevronRight,
} from 'lucide-react';

export const QueryEditor: React.FC = () => {
  const { activeDatabase, schemas, queryHistory, addHistoryItem, clearHistory, addToast } = useAerisStore();

  const [query, setQuery] = useState<string>(
    `-- Aeris CodeMirror 6 SQL Console\n-- Execute multi-statement SQL queries against ${activeDatabase}\n\nSELECT u.id, u.username, u.email, COUNT(o.id) as order_count, SUM(o.total_amount) as total_spent\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nGROUP BY u.id;\n`
  );

  const [isRunning, setIsRunning] = useState(false);
  const [activeResults, setActiveResults] = useState<QueryResult[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Build CodeMirror 6 SQL schema for auto-complete
  const sqlSchema = useMemo(() => {
    const map: Record<string, string[]> = {};
    schemas.forEach((s) => {
      map[s.name] = s.columns.map((c) => c.name);
    });
    return map;
  }, [schemas]);

  const extensions = useMemo(() => {
    return [
      sql({
        schema: sqlSchema,
        upperCaseKeywords: true,
      }),
    ];
  }, [sqlSchema]);

  const handleExecute = async () => {
    if (!query.trim()) return;

    setIsRunning(true);
    const startTime = performance.now();

    // Split multi-query statements by semicolon
    const statements = query
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const results: QueryResult[] = [];

    try {
      for (const stmt of statements) {
        const res = await ApiClient.executeQuery(stmt, activeDatabase);
        results.push(res);

        addHistoryItem({
          query: stmt,
          durationMs: res.executionTimeMs,
          status: res.error ? 'error' : 'success',
          affectedRows: res.affectedRows,
          error: res.error,
        });
      }

      setActiveResults(results);
      setSelectedResultIndex(0);

      const totalTime = +(performance.now() - startTime).toFixed(2);
      addToast({
        type: 'success',
        title: 'Query Executed',
        message: `Processed ${statements.length} query statement(s) in ${totalTime}ms`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Execution Failed',
        message: err?.message || 'An error occurred during query execution',
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Keyboard shortcut Ctrl+Enter or Cmd+Enter to run query
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportAsCSV = (result: QueryResult) => {
    if (!result.rows || result.rows.length === 0) return;
    const headers = result.columns.join(',');
    const csvRows = result.rows.map((r) =>
      result.columns.map((col) => JSON.stringify(r[col] ?? '')).join(',')
    );
    const blob = new Blob([[headers, ...csvRows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = (result: QueryResult) => {
    if (!result.rows) return;
    const blob = new Blob([JSON.stringify(result.rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentResult = activeResults[selectedResultIndex];

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#0b0f17]" onKeyDown={handleKeyDown}>
      {/* Main Editor & Results Panel */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Editor Toolbar */}
        <div className="h-11 bg-[#0d131f] border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExecute}
              disabled={isRunning || !query.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition shadow-md shadow-teal-500/10 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Executing...' : 'Run Query'}</span>
              <kbd className="hidden sm:inline-block px-1 py-0.2 bg-teal-600/30 text-slate-950 border border-teal-600/40 rounded text-[9px] font-mono ml-1">
                ⌘↵
              </kbd>
            </button>

            <div className="w-px h-4 bg-slate-800" />

            <button
              onClick={() =>
                setQuery(
                  `SELECT * FROM users LIMIT 10;\nSELECT * FROM orders LIMIT 10;`
                )
              }
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition"
              title="Sample SQL"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Sample</span>
            </button>

            <button
              onClick={() => copyToClipboard(query)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition"
              title="Copy Query"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition ${
                showHistory
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
              <span className="px-1.5 py-0.2 bg-slate-800 rounded-full text-[10px] font-mono">
                {queryHistory.length}
              </span>
            </button>
          </div>
        </div>

        {/* CodeMirror 6 Editor Container */}
        <div className="h-64 border-b border-slate-800/80 relative text-sm font-mono overflow-hidden">
          <CodeMirror
            value={query}
            height="100%"
            theme={oneDark}
            extensions={extensions}
            onChange={(val) => setQuery(val)}
            className="h-full text-sm font-mono"
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightSpecialChars: true,
              history: true,
              foldGutter: true,
              drawSelection: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              syntaxHighlighting: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: true,
              crosshairCursor: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              closeBracketsKeymap: true,
              searchKeymap: true,
              historyKeymap: true,
              foldKeymap: true,
              completionKeymap: true,
              lintKeymap: true,
            }}
          />
        </div>

        {/* Results Bar / Statement Selector */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#0b0f17]">
          {activeResults.length > 0 && (
            <div className="h-10 bg-[#0d131f] border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0">
              {/* Statement Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
                {activeResults.map((res, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedResultIndex(index)}
                    className={`px-3 py-1 rounded-md text-xs font-mono transition flex items-center gap-1.5 shrink-0 ${
                      selectedResultIndex === index
                        ? 'bg-slate-800 text-teal-300 font-medium border border-teal-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <span>Stmt #{index + 1}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({res.executionTimeMs}ms)
                    </span>
                  </button>
                ))}
              </div>

              {/* Execution Metrics & Export */}
              {currentResult && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>{currentResult.executionTimeMs} ms</span>
                    <span className="text-slate-600">•</span>
                    <span>{currentResult.rows?.length ?? 0} rows</span>
                    {currentResult.affectedRows !== undefined && currentResult.affectedRows > 0 && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span>{currentResult.affectedRows} affected</span>
                      </>
                    )}
                  </div>

                  <div className="w-px h-3 bg-slate-800" />

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => exportAsCSV(currentResult)}
                      disabled={!currentResult.rows || currentResult.rows.length === 0}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-teal-300 rounded transition disabled:opacity-30"
                      title="Export CSV"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => exportAsJSON(currentResult)}
                      disabled={!currentResult.rows}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-teal-300 rounded transition disabled:opacity-30"
                      title="Export JSON"
                    >
                      <FileCode2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Result Data View */}
          <div className="flex-1 overflow-auto p-4 custom-scrollbar">
            {activeResults.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Database className="w-12 h-12 text-slate-700 mb-3" />
                <h3 className="text-sm font-semibold text-slate-400">Ready for Query Execution</h3>
                <p className="text-xs font-mono text-slate-500 max-w-sm mt-1">
                  Write SQL queries above and hit Run (⌘↵). Results will render here in a grid table.
                </p>
              </div>
            ) : currentResult?.error ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm text-rose-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>SQLite Execution Error</span>
                </div>
                <pre className="font-mono text-xs p-3 bg-rose-950/80 rounded-lg overflow-x-auto whitespace-pre-wrap">
                  {currentResult.error}
                </pre>
              </div>
            ) : currentResult?.rows && currentResult.rows.length > 0 ? (
              <div className="border border-slate-800 rounded-xl overflow-hidden shadow-xl bg-slate-900/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                        {currentResult.columns.map((col) => (
                          <th key={col} className="px-4 py-2.5 font-semibold text-teal-400/90 whitespace-nowrap border-r border-slate-800/60 last:border-r-0">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {currentResult.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/50 transition">
                          {currentResult.columns.map((col) => (
                            <td key={col} className="px-4 py-2 text-slate-200 whitespace-nowrap border-r border-slate-800/40 last:border-r-0">
                              {row[col] === null ? (
                                <span className="text-slate-600 italic">NULL</span>
                              ) : typeof row[col] === 'boolean' ? (
                                <span className={row[col] ? 'text-emerald-400' : 'text-rose-400'}>
                                  {String(row[col])}
                                </span>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs font-mono text-slate-400 bg-slate-900/30 rounded-xl border border-slate-800">
                Query executed successfully. Affected rows: {currentResult?.affectedRows ?? 0}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Sidebar Drawer */}
      {showHistory && (
        <div className="w-80 bg-[#0d131f] border-l border-slate-800/80 flex flex-col shrink-0 select-none animate-in slide-in-from-right duration-200">
          <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-semibold text-slate-200">Query History</span>
            </div>
            <button
              onClick={clearHistory}
              className="p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition"
              title="Clear History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {queryHistory.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 font-mono">
                No query history yet.
              </div>
            ) : (
              queryHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setQuery(item.query)}
                  className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 rounded-lg cursor-pointer transition space-y-1.5 group"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className={item.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>
                      ● {item.durationMs}ms
                    </span>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <pre className="text-xs font-mono text-slate-300 line-clamp-3 whitespace-pre-wrap group-hover:text-teal-200 transition">
                    {item.query}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
