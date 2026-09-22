import type { IAdvisorReport, IApiEnvelope, IDatabase, IExplainNode, IHistoryEntry, IHistoryFilters, IImportResult, IImportSpec, IIndex, IQueryResult, ISavedQuery, ITable } from '../../interface/api.interface'
import type { IBatchOp, ITableDataResponse } from '../../utils/data-pending.util'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const body = (await res.json()) as IApiEnvelope<T>
  if (!res.ok || body.error) {
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return body.data as T
}

export const api = {
  health: () => req<{ status: string }>('/health'),
  listDatabases: () => req<string[]>('/databases'),
  attach: (name: string, inMemory: boolean) =>
    req<IDatabase>('/databases', { method: 'POST', body: JSON.stringify({ name, inMemory }) }),
  detach: (name: string) => req<{ detached: string }>(`/databases/${name}`, { method: 'DELETE' }),
  query: (db: string, sql: string, signal?: AbortSignal) =>
    req<IQueryResult>(`/databases/${db}/query`, { method: 'POST', body: JSON.stringify({ sql }), signal }),
  schema: (db: string) => req<ITable[]>(`/databases/${db}/schema`),
  history: (db: string, filters: IHistoryFilters = {}) => {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.statement_type) params.set('statement_type', filters.statement_type)
    if (filters.q) params.set('q', filters.q)
    if (filters.limit) params.set('limit', String(filters.limit))
    const qs = params.toString()
    return req<IHistoryEntry[]>(`/databases/${db}/queries/history${qs ? `?${qs}` : ''}`)
  },
  listSaved: (db: string) => req<ISavedQuery[]>(`/databases/${db}/queries/saved`),
  saveQuery: (db: string, title: string, category: string, queryText: string) =>
    req<ISavedQuery>(`/databases/${db}/queries/saved`, {
      method: 'POST',
      body: JSON.stringify({ title, category, queryText }),
    }),
  createTable: (db: string, spec: unknown) =>
    req<{ name: string }>(`/databases/${db}/schema/table`, { method: 'POST', body: JSON.stringify(spec) }),
  addColumn: (db: string, table: string, col: unknown) =>
    req<{ added: boolean }>(`/databases/${db}/schema/table/${table}/column`, { method: 'POST', body: JSON.stringify(col) }),
  browseTable: (db: string, table: string, params: { page?: number; page_size?: number; sort?: string[]; filter?: string[] } = {}) => {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.page_size) qs.set('page_size', String(params.page_size))
    for (const s of params.sort ?? []) qs.append('sort', s)
    for (const f of params.filter ?? []) qs.append('filter', f)
    const s = qs.toString()
    return req<ITableDataResponse>(`/databases/${db}/tables/${table}/data${s ? `?${s}` : ''}`)
  },
  batchTable: (db: string, table: string, operations: IBatchOp[]) =>
    req<{ applied: number }>(`/databases/${db}/tables/${table}/data/batch`, {
      method: 'POST',
      body: JSON.stringify({ operations }),
    }),
  deleteSaved: (db: string, id: string) =>
    fetch(`/api/v1/databases/${db}/queries/saved/${id}`, { method: 'DELETE' }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),
  pinHistory: (db: string, id: string, pinned: boolean) =>
    req<{ pinned: boolean }>(`/databases/${db}/queries/history/${id}/pin`, { method: 'PATCH', body: JSON.stringify({ pinned }) }),
  pruneHistory: (db: string, maxAgeDays?: number) =>
    req<{ deleted: number }>(`/databases/${db}/queries/history/prune`, { method: 'POST', body: JSON.stringify({ maxAgeDays }) }),
  dropColumn: (db: string, table: string, column: string, confirm: string) =>
    fetch(`/api/v1/databases/${db}/tables/${table}/columns/${column}?confirm=${encodeURIComponent(confirm)}`, { method: 'DELETE' }).then((res) => {
      if (!res.ok) return res.json().then((b: IApiEnvelope<unknown>) => Promise.reject(new Error(b.error ?? `HTTP ${res.status}`)))
    }),
  dropTable: (db: string, table: string, confirm: string) =>
    fetch(`/api/v1/databases/${db}/tables/${table}?confirm=${encodeURIComponent(confirm)}`, { method: 'DELETE' }).then((res) => {
      if (!res.ok) return res.json().then((b: IApiEnvelope<unknown>) => Promise.reject(new Error(b.error ?? `HTTP ${res.status}`)))
    }),
  renameTable: (db: string, table: string, newName: string) =>
    req<{ renamedTo: string }>(`/databases/${db}/tables/${table}`, { method: 'PATCH', body: JSON.stringify({ newName }) }),
  listIndexes: (db: string) => req<IIndex[]>(`/databases/${db}/indexes`),
  createIndex: (db: string, spec: { name: string; table: string; columns: string[]; unique: boolean }) =>
    req<{ name: string }>(`/databases/${db}/indexes`, { method: 'POST', body: JSON.stringify(spec) }),
  dropIndex: (db: string, name: string) =>
    fetch(`/api/v1/databases/${db}/indexes/${name}`, { method: 'DELETE' }).then((res) => {
      if (!res.ok) return res.json().then((b: IApiEnvelope<unknown>) => Promise.reject(new Error(b.error ?? `HTTP ${res.status}`)))
    }),
  explain: (db: string, sql: string) =>
    req<IExplainNode[]>(`/databases/${db}/explain`, { method: 'POST', body: JSON.stringify({ sql }) }),
  importCSV: (db: string, table: string, spec: IImportSpec) =>
    req<IImportResult>(`/databases/${db}/tables/${table}/import`, { method: 'POST', body: JSON.stringify(spec) }),
  exportUrl: (db: string, table: string, format: 'csv' | 'json'): string =>
    `/api/v1/databases/${db}/tables/${table}/export?format=${format}`,
  indexAdvisor: (db: string, table: string) =>
    req<IAdvisorReport>(`/databases/${db}/tables/${table}/advisor`),
}
