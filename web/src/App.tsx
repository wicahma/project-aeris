import { useEffect } from 'react'
import { DataGrid } from './components/molecules/DataGrid'
import { EditorTabs } from './components/molecules/EditorTabs'
import { ObjectTree } from './components/molecules/ObjectTree'
import { QueryEditor } from './components/organism/query/QueryEditor'
import { DataExplorer } from './components/organism/explorer/DataExplorer'
import { SchemaBuilderDialog } from './components/organism/schema/SchemaBuilderDialog'
import { useSchemaBuilderHooks } from './hooks/page/schema/useSchemaBuilderHooks'
import type { ITable } from './interface/api.interface'
import { useAerisStore } from './store/aeris.store'
import { getStoredKey, setStoredKey } from './utils/auth-storage.util'
import { useExplorerStore } from './store/global-states/explorer.store'

function App() {
  const { databases, activeDb, schema, result, error, refreshDatabases, attach, selectDb } = useAerisStore()
  const { setOpen } = useSchemaBuilderHooks()
  const { table: explorerTable, openTable } = useExplorerStore()

  useEffect(() => {
    refreshDatabases()
  }, [refreshDatabases])

  // First-run: offer bootstrap key creation when 401 + no stored key
  useEffect(() => {
    if (error?.includes('ERR_AUTH_REQUIRED') && !getStoredKey()) {
      const name = window.prompt('First run — create API key. Name:')
      if (name) {
        fetch('/api/v1/auth/bootstrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
          .then((r) => r.json())
          .then((b) => {
            if (b.data?.key) {
              setStoredKey(b.data.key)
              refreshDatabases()
            }
          })
      }
    }
  }, [error, refreshDatabases])

  const onSelectTable = (t: ITable) => {
    if (activeDb) void openTable(activeDb, t.name)
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-panel px-3 py-2">
        <span className="text-sm font-semibold text-heading">Aeris</span>
        <select
          aria-label="Active database"
          className="rounded-control border border-border bg-canvas px-2 py-1 text-sm text-text"
          value={activeDb ?? ''}
          onChange={(e) => selectDb(e.target.value)}
        >
          <option value="" disabled>
            Select database
          </option>
          {databases.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button
          className="rounded-control bg-accent px-2 py-1 text-sm text-white hover:opacity-90"
          onClick={() => {
            const name = window.prompt('Database name')
            if (name) attach(name, false)
          }}
        >
          + Attach
        </button>
        {activeDb && (
          <button
            className="rounded-control bg-accent px-2 py-1 text-sm text-white hover:opacity-90"
            onClick={() => setOpen(true)}
          >
            + Table
          </button>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 overflow-auto border-r border-border bg-panel p-2">
          <ObjectTree tables={schema} onSelect={onSelectTable} />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <EditorTabs />
          <QueryEditor />
          {error && (
            <div role="alert" className="border-b border-error bg-canvas px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden bg-canvas">
            {explorerTable ? (
              <DataExplorer />
            ) : result ? (
              <DataGrid result={result} />
            ) : (
              <p className="p-4 text-sm text-disabled">Run a query or click a table to see results</p>
            )}
          </div>
        </main>
      </div>

      <footer className="border-t border-border bg-panel px-3 py-1 text-xs text-muted">
        {activeDb ? `db: ${activeDb}` : 'no database'} · {schema.length} object(s)
        {result && ` · ${result.rows?.length ?? 0} rows · ${result.durationMs.toFixed(1)}ms`}
      </footer>
      <SchemaBuilderDialog />
    </div>
  )
}

export default App
