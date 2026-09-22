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
