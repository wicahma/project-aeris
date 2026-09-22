import { useState } from 'react'
import type { ITable } from '../../interface/api.interface'
import { api } from '../../services/database/api.service'
import { useAerisStore } from '../../store/aeris.store'

function TableRow({ t, onSelect }: { t: ITable; onSelect: (t: ITable) => void }) {
  const { activeDb, selectDb } = useAerisStore()
  const [menu, setMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const act = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
      if (activeDb) await selectDb(activeDb)
    } catch (e) {
      setError((e as Error).message)
    }
    setMenu(false)
  }

  const onRename = () => {
    const newName = window.prompt(`Rename "${t.name}" to:`)
    if (!newName || newName === t.name || !activeDb) return
    void act(() => api.renameTable(activeDb, t.name, newName))
  }

  const onDrop = () => {
    const confirm = window.prompt(`Type the table name "${t.name}" to confirm DROP:`)
    if (confirm === null || !activeDb) return
    void act(() => api.dropTable(activeDb, t.name, confirm))
  }

  const onNewIndex = () => {
    const cols = window.prompt(`Index on ${t.name} — column names (comma-separated):`)
    if (!cols || !activeDb) return
    const colList = cols.split(',').map((c) => c.trim()).filter(Boolean)
    const name = `idx_${t.name}_${colList.join('_')}`
    void act(() => api.createIndex(activeDb, { name, table: t.name, columns: colList, unique: false }))
  }

  const onImport = () => {
    if (!activeDb) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      const firstLine = text.split('\n')[0] ?? ''
      const headers = firstLine.split(',').map((h) => h.trim()).filter(Boolean)
      if (headers.length === 0) {
        setError('Empty CSV file')
        return
      }
      const strategy = window.prompt('Duplicate strategy (fail/skip/overwrite):', 'fail')
      if (strategy === null) return
      void act(() =>
        api.importCSV(activeDb, t.name, {
          columns: headers,
          hasHeader: true,
          duplicateStrategy: (strategy as 'fail' | 'skip' | 'overwrite') || 'fail',
          data: text,
        }).then((r) => {
          if (r.failedRows > 0) setError(`Import: ${r.insertedRows} inserted, ${r.failedRows} failed`)
        }),
      )
    }
    input.click()
  }

  const onExport = (format: 'csv' | 'json') => {
    if (!activeDb) return
    window.open(api.exportUrl(activeDb, t.name, format), '_blank')
    setMenu(false)
  }

  return (
    <li className="relative">
      <div className="group flex items-center">
        <button
          onClick={() => onSelect(t)}
          className="flex-1 rounded-control px-2 py-1 text-left text-text hover:bg-hover"
        >
          {t.name}
        </button>
        <button
          onClick={() => setMenu((m) => !m)}
          aria-label={`Actions for ${t.name}`}
          className="px-1 text-xs text-muted opacity-0 hover:text-text group-hover:opacity-100"
        >
          ⋯
        </button>
      </div>
      {menu && (
        <div className="absolute right-0 z-10 w-32 rounded-control border border-border bg-panel shadow-lg">
          <button onClick={onRename} className="block w-full px-2 py-1 text-left text-xs hover:bg-hover">Rename</button>
          <button onClick={onNewIndex} className="block w-full px-2 py-1 text-left text-xs hover:bg-hover">+ Index</button>
          <button onClick={onImport} className="block w-full px-2 py-1 text-left text-xs hover:bg-hover">Import CSV</button>
          <button onClick={() => onExport('csv')} className="block w-full px-2 py-1 text-left text-xs hover:bg-hover">Export CSV</button>
          <button onClick={() => onExport('json')} className="block w-full px-2 py-1 text-left text-xs hover:bg-hover">Export JSON</button>
          <button onClick={onDrop} className="block w-full px-2 py-1 text-left text-xs text-error hover:bg-hover">Drop</button>
        </div>
      )}
      {error && <p className="px-2 py-0.5 text-[10px] text-error" role="alert">{error}</p>}
    </li>
  )
}

export function ObjectTree({ tables, onSelect }: { tables: ITable[]; onSelect: (t: ITable) => void }) {
  const groups = [
    { label: 'Tables', items: tables.filter((t) => t.type === 'table') },
    { label: 'Views', items: tables.filter((t) => t.type === 'view') },
  ]
  return (
    <nav aria-label="Object navigator" className="text-sm">
      {groups.map((g) => (
        <details key={g.label} open className="mb-1">
          <summary className="cursor-pointer select-none px-2 py-1 text-muted hover:text-text">
            {g.label} <span className="text-disabled">({g.items.length})</span>
          </summary>
          <ul className="ml-3">
            {g.items.map((t) => (
              <TableRow key={t.name} t={t} onSelect={onSelect} />
            ))}
          </ul>
        </details>
      ))}
      {tables.length === 0 && <p className="px-2 py-1 text-disabled">No objects</p>}
    </nav>
  )
}
