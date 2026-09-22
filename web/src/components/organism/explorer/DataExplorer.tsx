import { useState } from 'react'
import { useDataExplorerHooks } from '../../../hooks/page/explorer/useDataExplorerHooks'
import { CellValue } from '../../atoms/CellValue'
import { IconButton } from '../../atoms/IconButton'

function EditableCell({
  rowId, column, value, edited, onEdit,
}: {
  rowId: number; column: string; value: unknown; edited: boolean; onEdit: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (!editing) {
    return (
      <td
        onDoubleClick={() => {
          setEditing(true)
          setDraft(value === null ? '' : String(value))
        }}
        className={`max-w-96 cursor-cell truncate border border-border px-2 py-1 ${edited ? 'bg-warning/20' : ''}`}
        title="Double-click to edit"
      >
        <CellValue value={value} />
      </td>
    )
  }
  return (
    <td className="border border-accent bg-canvas px-1 py-0.5">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (draft !== (value === null ? '' : String(value))) onEdit(draft)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="w-full bg-transparent text-xs outline-none"
      />
    </td>
  )
}

export function DataExplorer() {
  const ex = useDataExplorerHooks()
  if (!ex.table || !ex.data) return null
  const data = ex.data
  const { columns, rowIds } = data
  const pageCount = Math.max(1, Math.ceil(ex.data.totalRows / ex.pageSize))
  const editKeys = new Set(ex.pending.edits.map((e) => `${e.rowId}|${e.column}`))
  const deleteSet = new Set(ex.pending.deletes)

  return (
    <section aria-label="Data explorer" className="flex h-full flex-col border-t border-border bg-canvas">
      <div className="flex items-center gap-2 border-b border-border bg-panel px-2 py-1 text-xs">
        <span className="font-semibold text-heading">Table: {ex.table}</span>
        <span className="text-muted">{ex.data.totalRows} row(s)</span>
        {ex.dirty > 0 && <span className="text-warning">{ex.dirty} pending change(s)</span>}
        <div className="ml-auto flex gap-1">
          <IconButton onClick={ex.addRow}>+ Row</IconButton>
          <IconButton disabled={ex.dirty === 0} onClick={ex.clearPending}>Clear</IconButton>
          <IconButton
            disabled={ex.dirty === 0 || ex.committing}
            onClick={() => void ex.onCommit()}
            active
          >
            {ex.committing ? 'Saving…' : 'Save'}
          </IconButton>
          <IconButton onClick={ex.close}>×</IconButton>
        </div>
      </div>

      {ex.error && <div role="alert" className="border-b border-error px-3 py-1 text-xs text-error">{ex.error}</div>}
      {ex.loading && <div className="px-3 py-1 text-xs text-muted">Loading…</div>}

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky top-0 border border-border bg-panel px-2 py-1 text-left text-xs text-heading" />
              {columns.map((c) => (
                <th key={c.name} className="sticky top-0 border border-border bg-panel px-2 py-1 text-left text-xs text-heading">
                  {c.name} <span className="text-muted text-[10px]">{c.type}{c.primaryKey ? ' PK' : ''}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ex.visibleRows.map((row, i) => {
              const rid = rowIds[i] ?? -(i + 1)
              const isInserted = i >= data.rows.length
              const isDeleted = deleteSet.has(rid)
              return (
                <tr key={rid} className={`${i % 2 ? 'bg-canvas' : 'bg-panel'} ${isDeleted ? 'opacity-40 line-through' : ''}`}>
                  <td className="border border-border px-1 py-0.5 text-center">
                    {!isInserted && (
                      <button
                        onClick={() => ex.deleteRow(rid)}
                        aria-label={`Delete row ${rid}`}
                        className="text-xs text-error"
                      >
                        ×
                      </button>
                    )}
                  </td>
                  {row.map((cell, j) => {
                    const col = columns[j]
                    if (isInserted) {
                      return (
                        <td key={j} className="border border-accent/40 bg-canvas px-1 py-0.5">
                          <input
                            aria-label={`Insert ${col.name}`}
                            placeholder={col.name}
                            onChange={(e) => ex.setInsertValue(i - data.rows.length, col.name, e.target.value)}
                            className="w-full bg-transparent text-xs outline-none"
                          />
                        </td>
                      )
                    }
                    return (
                      <EditableCell
                        key={j}
                        rowId={rid}
                        column={col.name}
                        value={cell}
                        edited={editKeys.has(`${rid}|${col.name}`)}
                        onEdit={(v) => ex.onCellEdit(rid, col.name, v)}
                      />
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
        {ex.visibleRows.length === 0 && <p className="p-4 text-sm text-disabled">No rows</p>}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-2 border-t border-border bg-panel px-2 py-1 text-xs text-muted">
          <IconButton disabled={ex.page <= 1} onClick={() => ex.onPage(1)}>«</IconButton>
          <IconButton disabled={ex.page <= 1} onClick={() => ex.onPage(ex.page - 1)}>‹</IconButton>
          <span>page {ex.page} / {pageCount}</span>
          <IconButton disabled={ex.page >= pageCount} onClick={() => ex.onPage(ex.page + 1)}>›</IconButton>
          <IconButton disabled={ex.page >= pageCount} onClick={() => ex.onPage(pageCount)}>»</IconButton>
        </div>
      )}
    </section>
  )
}
