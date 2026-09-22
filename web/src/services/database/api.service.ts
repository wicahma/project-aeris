import type { IApiEnvelope, IDatabase, IHistoryEntry, IHistoryFilters, IQueryResult, ISavedQuery, ITable } from '../../interface/api.interface'

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
  query: (db: string, sql: string) =>
    req<IQueryResult>(`/databases/${db}/query`, { method: 'POST', body: JSON.stringify({ sql }) }),
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
  deleteSaved: (db: string, id: string) =>
    fetch(`/api/v1/databases/${db}/queries/saved/${id}`, { method: 'DELETE' }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),
}
