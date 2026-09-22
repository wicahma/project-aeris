import type { IApiEnvelope, IDatabase, IQueryResult, ITable } from '../../interface/api.interface'

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
}
