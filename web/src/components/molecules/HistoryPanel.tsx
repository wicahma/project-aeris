import { useEffect, useState } from 'react'
import { formatTimestamp } from '../../utils/format-timestamp.util'
import { useHistoryPanelHooks } from '../../hooks/page/query/useHistoryPanelHooks'
import { useAerisStore } from '../../store/aeris.store'
import { getStoredKey } from '../../utils/auth-storage.util'
import type { IHistoryEntry } from '../../interface/api.interface'

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: 'text-accent',
  FAILED: 'text-error',
}

function HistoryRow({ entry, onReuse, onPin }: { entry: IHistoryEntry; onReuse: (sql: string) => void; onPin: (id: string, pinned: boolean) => void }) {
  return (
    <div className="flex w-full items-center gap-2 border-b border-border px-2 py-1 text-xs hover:bg-hover">
      <button
        onClick={() => onPin(entry.queryId, !entry.pinned)}
        aria-label={entry.pinned ? 'Unpin' : 'Pin'}
        className={`shrink-0 ${entry.pinned ? 'text-accent' : 'text-disabled hover:text-muted'}`}
      >
        {entry.pinned ? '●' : '○'}
      </button>
      <button onClick={() => onReuse(entry.queryText)} title={entry.errorMessage || entry.queryText} className="flex flex-1 items-center gap-2 text-left">
        <span className={`w-14 shrink-0 ${STATUS_COLOR[entry.status] ?? ''}`}>{entry.status}</span>
        <span className="w-16 shrink-0 text-muted">{entry.statementType}</span>
        <span className="flex-1 truncate font-mono">{entry.snippet}</span>
        <span className="shrink-0 text-muted">{formatTimestamp(entry.executedAt)}</span>
      </button>
    </div>
  )
}

function SavedRow({ title, category, onUse, onDelete }: { title: string; category: string; onUse: () => void; onDelete: () => void }) {
  return (
    <div className="flex w-full items-center gap-2 border-b border-border px-2 py-1 text-xs hover:bg-hover">
      <span className="flex-1 truncate" title={title}>{title}</span>
      <span className="shrink-0 rounded-control bg-panel px-1.5 text-muted">{category}</span>
      <button onClick={onUse} className="text-accent hover:underline" aria-label={`Use ${title}`}>Use</button>
      <button onClick={onDelete} className="text-error hover:underline" aria-label={`Delete ${title}`}>Del</button>
    </div>
  )
}

function MigrationList() {
  const [migrations, setMigrations] = useState<Array<{ sequence: number; changeType: string; target: string; ddl: string; checksum: string; status: string; appliedAt: number }>>([])
  const [loading, setLoading] = useState(false)
  const { activeDb } = useAerisStore()

  useEffect(() => {
    if (!activeDb) return
    setLoading(true)
    const k = getStoredKey()
    fetch(`/api/v1/databases/${activeDb}/migrations`, {
      headers: k ? { Authorization: `Bearer ${k}` } : {},
    })
      .then((r) => r.json())
      .then((b) => setMigrations(b.data ?? []))
      .catch(() => setMigrations([]))
      .finally(() => setLoading(false))
  }, [activeDb])

  if (loading) return <div className="px-2 py-2 text-xs text-muted">Loading…</div>
  if (migrations.length === 0) return <div className="px-2 py-2 text-xs text-muted">No migrations yet.</div>

  return (
    <div className="text-xs">
      {migrations.map((m) => (
        <div key={m.sequence} className="flex items-center gap-2 border-b border-border px-2 py-1 hover:bg-hover">
          <span className="w-8 shrink-0 text-muted">#{m.sequence}</span>
          <span className="w-20 shrink-0 text-muted">{m.changeType}</span>
          <span className="flex-1 truncate font-mono" title={m.ddl}>{m.target}</span>
          <span className="shrink-0 text-muted">{m.status}</span>
          <span className="shrink-0 text-muted">{formatTimestamp(m.appliedAt)}</span>
        </div>
      ))}
    </div>
  )
}

function APIKeyList() {
  const [keys, setKeys] = useState<Array<{ id: number; name: string; createdAt: string; expiresAt?: string }>>([])
  const [newKey, setNewKey] = useState<{ name: string; key: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const { activeDb } = useAerisStore()

  const load = () => {
    if (!activeDb) return
    setLoading(true)
    const k = getStoredKey()
    fetch(`/api/v1/databases/${activeDb}/auth/keys`, {
      headers: k ? { Authorization: `Bearer ${k}` } : {},
    })
      .then((r) => r.json())
      .then((b) => setKeys(b.data ?? []))
      .catch(() => setKeys([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [activeDb])

  const createKey = () => {
    const name = prompt('Key name:')
    if (!name || !activeDb) return
    const k = getStoredKey()
    fetch(`/api/v1/databases/${activeDb}/auth/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(k ? { Authorization: `Bearer ${k}` } : {}),
      },
      body: JSON.stringify({ name }),
    })
      .then((r) => r.json())
      .then((b) => {
        setNewKey({ name, key: b.data.key })
        load()
      })
  }

  const deleteKey = (id: number) => {
    if (!activeDb || !confirm('Delete this key?')) return
    const k = getStoredKey()
    fetch(`/api/v1/databases/${activeDb}/auth/keys/${id}`, {
      method: 'DELETE',
      headers: k ? { Authorization: `Bearer ${k}` } : {},
    }).then(load)
  }

  if (loading) return <div className="px-2 py-2 text-xs text-muted">Loading…</div>

  return (
    <div className="text-xs">
      <div className="flex items-center justify-between border-b border-border px-2 py-1">
        <span className="text-muted">API Keys</span>
        <button onClick={createKey} className="text-accent hover:underline">New</button>
      </div>
      {newKey && (
        <div className="border-b border-border bg-canvas px-2 py-1">
          <div className="text-muted">New key (copy now, won't show again):</div>
          <code className="block break-all rounded bg-panel p-1 font-mono text-xs">{newKey.key}</code>
          <button onClick={() => setNewKey(null)} className="mt-1 text-muted hover:text-text">Dismiss</button>
        </div>
      )}
      {keys.length === 0 && <div className="px-2 py-2 text-muted">No API keys.</div>}
      {keys.map((k) => (
        <div key={k.id} className="flex items-center gap-2 border-b border-border px-2 py-1 hover:bg-hover">
          <span className="flex-1 truncate">{k.name}</span>
          <span className="shrink-0 text-muted">{k.createdAt.slice(0, 10)}</span>
          {k.expiresAt && <span className="shrink-0 text-muted">exp {k.expiresAt.slice(0, 10)}</span>}
          <button onClick={() => deleteKey(k.id)} className="shrink-0 text-error hover:underline">Del</button>
        </div>
      ))}
    </div>
  )
}

export function HistoryPanel() {
  const { entries, saved, filters, loading, error, activeDb, promptOpen, activeSql, reuseSql, setPromptOpen, onFilter, onSave, onDeleteSaved, onTogglePin, onPrune } =
    useHistoryPanelHooks()
  const [tab, setTab] = useState<'history' | 'saved' | 'migrations' | 'keys'>('history')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')

  if (!activeDb) return null

  return (
    <section aria-label="Query history" className="flex max-h-64 flex-col border-t border-border bg-panel">
      <div className="flex items-center gap-2 border-b border-border px-2 py-1">
        <button
          onClick={() => setTab('history')}
          className={`text-xs ${tab === 'history' ? 'font-semibold text-text' : 'text-muted'}`}
        >
          History
        </button>
        <button
          onClick={() => setTab('saved')}
          className={`text-xs ${tab === 'saved' ? 'font-semibold text-text' : 'text-muted'}`}
        >
          Saved ({saved.length})
        </button>
        <button
          onClick={() => setTab('migrations')}
          className={`text-xs ${tab === 'migrations' ? 'font-semibold text-text' : 'text-muted'}`}
        >
          Migrations
        </button>
        <button
          onClick={() => setTab('keys')}
          className={`text-xs ${tab === 'keys' ? 'font-semibold text-text' : 'text-muted'}`}
        >
          Keys
        </button>
        <div className="ml-auto flex items-center gap-1">
          {tab === 'history' && (
            <>
              <select
                aria-label="Filter by status"
                value={filters.status ?? ''}
                onChange={(e) => onFilter({ status: e.target.value || undefined })}
                className="rounded-control bg-canvas px-1 text-xs"
              >
                <option value="">All status</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
              </select>
              <select
                aria-label="Filter by type"
                value={filters.statement_type ?? ''}
                onChange={(e) => onFilter({ statement_type: e.target.value || undefined })}
                className="rounded-control bg-canvas px-1 text-xs"
              >
                <option value="">All types</option>
                {['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DDL', 'PRAGMA'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                aria-label="Search queries"
                placeholder="Search…"
                value={filters.q ?? ''}
                onChange={(e) => onFilter({ q: e.target.value || undefined })}
                className="w-28 rounded-control bg-canvas px-1 text-xs"
              />
            </>
          )}
          {tab === 'history' && (
            <button onClick={onPrune} className="text-xs text-muted hover:text-text" aria-label="Prune history" title="Prune history">
              ✂
            </button>
          )}
          {tab === 'saved' && (
            <button onClick={() => setPromptOpen(true)} className="text-xs text-accent hover:underline">
              Save current
            </button>
          )}
        </div>
      </div>

      {error && <div role="alert" className="px-2 py-1 text-xs text-error">{error}</div>}
      {loading && <div className="px-2 py-1 text-xs text-muted">Loading…</div>}

      <div className="flex-1 overflow-y-auto">
        {tab === 'history' &&
          entries.map((e) => <HistoryRow key={e.queryId} entry={e} onReuse={reuseSql} onPin={onTogglePin} />)}
        {tab === 'saved' &&
          saved.map((s) => (
            <SavedRow
              key={s.id}
              title={s.title}
              category={s.category}
              onUse={() => reuseSql(s.queryText)}
              onDelete={() => onDeleteSaved(s.id)}
            />
          ))}
        {tab === 'history' && !loading && entries.length === 0 && (
          <div className="px-2 py-2 text-xs text-muted">No queries yet.</div>
        )}
        {tab === 'saved' && saved.length === 0 && (
          <div className="px-2 py-2 text-xs text-muted">No saved queries.</div>
        )}
        {tab === 'migrations' && <MigrationList />}
        {tab === 'keys' && <APIKeyList />}
      </div>

      {promptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-label="Save query">
          <div className="w-80 rounded-control border border-border bg-canvas p-4">
            <h2 className="mb-2 text-sm font-semibold">Save query</h2>
            <label className="mb-1 block text-xs text-muted">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-2 w-full rounded-control border border-border bg-panel px-2 py-1 text-xs"
            />
            <label className="mb-1 block text-xs text-muted">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="General"
              className="mb-3 w-full rounded-control border border-border bg-panel px-2 py-1 text-xs"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setPromptOpen(false)} className="rounded-control px-2 py-1 text-xs text-muted hover:bg-hover">
                Cancel
              </button>
              <button
                disabled={!title.trim()}
                onClick={() => {
                  void onSave(title.trim(), category.trim(), activeSql)
                  setPromptOpen(false)
                  setTitle('')
                  setCategory('')
                }}
                className="rounded-control bg-accent px-2 py-1 text-xs text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
