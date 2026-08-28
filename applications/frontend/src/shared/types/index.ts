export interface DatabaseInfo {
  name: string;
  size: string;
  walMode: boolean;
  tableCount: number;
  isInMemory: boolean;
  lastModified?: string;
}

export interface ForeignKeyRef {
  table: string;
  column: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface ColumnDef {
  name: string;
  type: 'INTEGER' | 'TEXT' | 'REAL' | 'BLOB' | 'BOOLEAN' | 'DATETIME';
  primaryKey: boolean;
  nullable: boolean;
  unique: boolean;
  defaultValue?: string;
  references?: ForeignKeyRef;
}

export interface TableSchema {
  name: string;
  columns: ColumnDef[];
  rowCount: number;
  indexes?: string[];
  createdAt?: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  executionTimeMs: number;
  affectedRows?: number;
  query: string;
  timestamp: number;
  error?: string;
}

export interface MetricsData {
  cpuUsage: number; // percentage
  ramUsageMB: number; // MB
  qps: number; // queries per second
  activeConnections: number;
  cacheHitRatio: number; // percentage
  slowQueriesCount: number;
  timestamp: number;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  durationMs: number;
  status: 'success' | 'error';
  affectedRows?: number;
  error?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

export type ActiveTab = 'query-editor' | 'schema-builder' | 'data-explorer' | 'dashboard';
