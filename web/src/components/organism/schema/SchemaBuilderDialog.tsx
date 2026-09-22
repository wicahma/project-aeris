import { useSchemaBuilderHooks } from '../../../hooks/page/schema/useSchemaBuilderHooks'

const TYPES = ['INTEGER', 'TEXT', 'REAL', 'BLOB'] as const

export function SchemaBuilderDialog() {
  const {
    open, setOpen, spec, setName, setColumn, addColumn, removeColumn,
    validationError, ddl, submitting, submitError, submit, activeDb,
  } = useSchemaBuilderHooks()

  if (!open || !activeDb) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-label="Create table">
      <div className="flex max-h-[85vh] w-[560px] flex-col rounded-control border border-border bg-canvas p-4">
        <h2 className="mb-3 text-sm font-semibold">Create table</h2>

        <label className="mb-1 block text-xs text-muted" htmlFor="table-name">Table name</label>
        <input
          id="table-name"
          autoFocus
          value={spec.name}
          onChange={(e) => setName(e.target.value)}
          placeholder="users"
          className="mb-1 w-full rounded-control border border-border bg-panel px-2 py-1 text-sm"
        />
        {validationError && (
          <p role="alert" className="mb-1 text-xs text-error">{validationError}</p>
        )}

        <div className="mb-1 mt-3 grid grid-cols-[1fr_100px_60px_60px_40px_40px] items-center gap-1 text-xs text-muted">
          <span>Column</span><span>Type</span><span>PK</span><span>NN</span><span>UQ</span><span />
        </div>
        <div className="flex-1 overflow-y-auto">
          {spec.columns.map((c, i) => (
            <div key={i} className="mb-1 grid grid-cols-[1fr_100px_60px_60px_40px_40px] items-center gap-1">
              <input
                aria-label={`Column ${i + 1} name`}
                value={c.name}
                onChange={(e) => setColumn(i, { name: e.target.value })}
                className="rounded-control border border-border bg-panel px-2 py-1 text-sm"
              />
              <select
                aria-label={`Column ${i + 1} type`}
                value={c.type}
                onChange={(e) => setColumn(i, { type: e.target.value })}
                className="rounded-control border border-border bg-panel px-1 py-1 text-sm"
              >
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input type="checkbox" aria-label={`Column ${i + 1} primary key`} checked={c.primaryKey} onChange={(e) => setColumn(i, { primaryKey: e.target.checked })} />
              <input type="checkbox" aria-label={`Column ${i + 1} not null`} checked={c.notNull} onChange={(e) => setColumn(i, { notNull: e.target.checked })} />
              <input type="checkbox" aria-label={`Column ${i + 1} unique`} checked={c.unique} onChange={(e) => setColumn(i, { unique: e.target.checked })} />
              <button
                onClick={() => removeColumn(i)}
                disabled={spec.columns.length === 1}
                aria-label={`Remove column ${i + 1}`}
                className="text-error disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button onClick={addColumn} className="mb-2 mt-1 self-start text-xs text-accent hover:underline">
          + Add column
        </button>

        <label className="mb-1 block text-xs text-muted">DDL preview</label>
        <pre className="mb-3 max-h-24 overflow-auto rounded-control bg-panel p-2 font-mono text-xs text-muted">{ddl || '—'}</pre>

        {submitError && <p role="alert" className="mb-2 text-xs text-error">{submitError}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className="rounded-control px-3 py-1 text-xs text-muted hover:bg-hover">
            Cancel
          </button>
          <button
            disabled={!!validationError || submitting || !spec.name}
            onClick={() => void submit(activeDb)}
            className="rounded-control bg-accent px-3 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
