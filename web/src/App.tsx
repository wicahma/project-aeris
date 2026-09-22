import { useEffect, useState } from 'react'
import { DataGrid } from './components/molecules/DataGrid'
import { ObjectTree } from './components/molecules/ObjectTree'
import type { ITable } from './interface/api.interface'
import { useAerisStore } from './store/aeris.store'

function App() {
  const { databases, activeDb, schema, result, error, loading, refreshDatabases, attach, selectDb, runQuery } =
    useAerisStore()
  const [sql, setSql] = useState('SELECT 1')

  useEffect(() => {
    refreshDatabases()
  }, [refreshDatabases])

  const onSelectTable = (t: ITable) => {
    setSql(`SELECT * FROM "${t.name}" LIMIT 200`)
    runQuery(`SELECT * FROM "${t.name}" LIMIT 200`)
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
        <span className="ml-auto text-xs text-muted">{loading ? 'Running…' : 'Ready'}</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 overflow-auto border-r border-border bg-panel p-2">
          <ObjectTree tables={schema} onSelect={onSelectTable} />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-border bg-canvas p-2">
            <textarea
              aria-label="SQL editor"
              className="h-28 w-full resize-y rounded-island border border-border bg-canvas p-2 font-mono text-sm text-text outline-none focus:border-accent"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runQuery(sql)
              }}
            />
            <div className="mt-1 flex gap-2">
              <button
                className="rounded-control bg-accent px-3 py-1 text-sm text-white hover:opacity-90 disabled:opacity-50"
                disabled={!activeDb || loading}
                onClick={() => runQuery(sql)}
              >
                Run (Ctrl+Enter)
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="border-b border-error bg-canvas px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto bg-canvas">
            {result ? <DataGrid result={result} /> : <p className="p-4 text-sm text-disabled">Run a query to see results</p>}
          </div>
        </main>
      </div>

      <footer className="border-t border-border bg-panel px-3 py-1 text-xs text-muted">
        {activeDb ? `db: ${activeDb}` : 'no database'} · {schema.length} object(s)
      </footer>
    </div>
  )
}

export default App
