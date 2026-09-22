import { sql, type SQLNamespace } from '@codemirror/lang-sql'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, codeFolding, foldGutter } from '@codemirror/language'
import { closeBrackets } from '@codemirror/autocomplete'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { islandsDark } from '../../../config/cm-theme.config'
import { useQueryEditorHooks } from '../../../hooks/page/query/useQueryEditorHooks'
import { useAerisStore } from '../../../store/aeris.store'
import { formatDuration } from '../../../utils/format.util'
import { HistoryPanel } from '../../molecules/HistoryPanel'

export function QueryEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { activeTab, activeDb, loading, editorError, handleRun, handleFormat, runSql, updateSql, plan, planError, handleExplain, closePlan } = useQueryEditorHooks()
  const { schema, result } = useAerisStore()
  const runSqlRef = useRef(runSql)
  runSqlRef.current = runSql

  useEffect(() => {
    if (!containerRef.current) return
    const namespace: SQLNamespace = Object.fromEntries(
      schema.map((t) => [t.name, t.columns.map((c) => c.name)]),
    )
    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: activeTab.sql,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          history(),
          codeFolding(),
          foldGutter(),
          bracketMatching(),
          closeBrackets(),
          highlightSelectionMatches(),
          keymap.of([
            {
              key: 'Mod-Enter',
              run: () => {
                const sel = view.state.selection.main
                const text = sel.empty ? view.state.doc.toString() : view.state.sliceDoc(sel.from, sel.to)
                runSqlRef.current(text)
                return true
              },
            },
            {
              key: 'Mod-Shift-f',
              run: () => {
                handleFormat()
                return true
              },
            },
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
          ]),
          sql({ schema: namespace, upperCaseKeywords: true }),
          islandsDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) updateSql(activeTab.id, update.state.doc.toString())
          }),
        ],
      }),
    })
    viewRef.current = view
    return () => view.destroy()
  }, [activeTab.id, schema])

  useEffect(() => {
    const view = viewRef.current
    if (view && view.state.doc.toString() !== activeTab.sql) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: activeTab.sql } })
    }
  }, [activeTab.sql])

  return (
    <section aria-label="Query editor" className="flex flex-col border-b border-border bg-canvas">
      <div ref={containerRef} className="min-h-32" />
      {editorError && (
        <div role="alert" className="border-t border-error px-3 py-1 text-xs text-error">
          {editorError}
        </div>
      )}
      <div className="flex items-center gap-2 border-t border-border bg-panel px-2 py-1">
        <button
          disabled={!activeDb || loading}
          onClick={() => handleRun()}
          className="rounded-control bg-accent px-3 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Running…' : 'Run (Ctrl+Enter)'}
        </button>
        <button
          onClick={handleFormat}
          className="rounded-control px-2 py-1 text-xs text-muted hover:bg-hover hover:text-text"
        >
          Format (Ctrl+Shift+F)
        </button>
        <button
          disabled={!activeDb}
          onClick={() => void handleExplain()}
          className="rounded-control px-2 py-1 text-xs text-muted hover:bg-hover hover:text-text disabled:opacity-50"
        >
          Explain
        </button>
        {loading && (
          <button
            onClick={() => useAerisStore.getState().cancelQuery()}
            className="rounded-control px-2 py-1 text-xs text-error hover:bg-hover"
          >
            Cancel
          </button>
        )}
        <span className="ml-auto text-xs text-muted">
          {activeDb ? `db: ${activeDb}` : 'no database selected'}
          {result ? ` · ${formatDuration(result.durationMs)}` : ''}
        </span>
      </div>
      {activeDb && <HistoryPanel />}
      {(plan || planError) && (
        <div className="border-t border-border bg-panel px-3 py-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-heading">Query Plan</span>
            <button onClick={closePlan} className="text-xs text-muted hover:text-text" aria-label="Close plan">×</button>
          </div>
          {planError && <p role="alert" className="text-xs text-error">{planError}</p>}
          {plan && (
            <ul className="space-y-0.5 text-xs">
              {plan.map((n) => (
                <li key={n.id} className="font-mono text-text" style={{ paddingLeft: `${n.parent === 0 ? 0 : 12}px` }}>
                  <span className="text-muted">#{n.id}</span> {n.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
