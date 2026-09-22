export interface IColumn {
  name: string
  type: string
  nullable: boolean
  default: unknown
  primaryKey: boolean
}

export interface ITable {
  name: string
  type: string
  columns: IColumn[]
}

export interface IQueryResult {
  columns: string[]
  rows: unknown[][]
  rowsAffected: number
  durationMs: number
}

export interface IDatabase {
  name: string
  path: string
  inMemory: boolean
}

export interface IApiEnvelope<T> {
  data?: T
  error?: string
}

export interface IHistoryEntry {
  queryId: string
  snippet: string
  queryText: string
  statementType: string
  status: 'SUCCESS' | 'FAILED'
  durationMs: number
  rowsAffected: number
  rowsReturned: number
  errorMessage: string
  executedAt: number
  pinned: boolean
}

export interface ISavedQuery {
  id: string
  title: string
  category: string
  queryText: string
  createdAt: number
  updatedAt: number
}

export interface IHistoryFilters {
  status?: string
  statement_type?: string
  q?: string
  limit?: number
}
