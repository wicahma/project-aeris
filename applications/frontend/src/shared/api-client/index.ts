import { DatabaseInfo, TableSchema, QueryResult, MetricsData } from '../types';

// Default mock databases and tables state for fallback/standalone mode
const initialDatabases: DatabaseInfo[] = [
  { name: 'main.db', size: '2.4 MB', walMode: true, tableCount: 5, isInMemory: false, lastModified: '2026-08-28 08:30:12' },
  { name: 'analytics.db', size: '18.1 MB', walMode: true, tableCount: 3, isInMemory: false, lastModified: '2026-08-28 07:15:00' },
  { name: 'users_auth.db', size: '512 KB', walMode: true, tableCount: 4, isInMemory: false, lastModified: '2026-08-27 19:42:10' },
  { name: 'test_memory.db', size: '0 KB (Memory)', walMode: false, tableCount: 2, isInMemory: true, lastModified: 'Active Session' },
];

let mockDatabases = [...initialDatabases];
let activeDbName = 'main.db';

const initialSchemas: Record<string, TableSchema[]> = {
  'main.db': [
    {
      name: 'users',
      rowCount: 1250,
      createdAt: '2026-01-10',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
        { name: 'username', type: 'TEXT', primaryKey: false, nullable: false, unique: true },
        { name: 'email', type: 'TEXT', primaryKey: false, nullable: false, unique: true },
        { name: 'role', type: 'TEXT', primaryKey: false, nullable: false, unique: false, defaultValue: "'user'" },
        { name: 'is_active', type: 'BOOLEAN', primaryKey: false, nullable: false, unique: false, defaultValue: '1' },
        { name: 'created_at', type: 'DATETIME', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
      ],
      indexes: ['idx_users_username', 'idx_users_email'],
    },
    {
      name: 'orders',
      rowCount: 4890,
      createdAt: '2026-01-15',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
        { name: 'user_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, references: { table: 'users', column: 'id', onDelete: 'CASCADE' } },
        { name: 'total_amount', type: 'REAL', primaryKey: false, nullable: false, unique: false },
        { name: 'status', type: 'TEXT', primaryKey: false, nullable: false, unique: false, defaultValue: "'pending'" },
        { name: 'created_at', type: 'DATETIME', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
      ],
      indexes: ['idx_orders_user_id', 'idx_orders_status'],
    },
    {
      name: 'products',
      rowCount: 320,
      createdAt: '2026-02-01',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
        { name: 'sku', type: 'TEXT', primaryKey: false, nullable: false, unique: true },
        { name: 'name', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
        { name: 'price', type: 'REAL', primaryKey: false, nullable: false, unique: false },
        { name: 'stock_quantity', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, defaultValue: '0' },
      ],
      indexes: ['idx_products_sku'],
    },
    {
      name: 'system_logs',
      rowCount: 15420,
      createdAt: '2026-02-10',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
        { name: 'level', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
        { name: 'message', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
        { name: 'timestamp', type: 'DATETIME', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
      ],
    },
    {
      name: 'webhooks',
      rowCount: 12,
      createdAt: '2026-03-01',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
        { name: 'event_type', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
        { name: 'target_url', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
        { name: 'is_enabled', type: 'BOOLEAN', primaryKey: false, nullable: false, unique: false, defaultValue: '1' },
      ],
    },
  ],
  'analytics.db': [
    {
      name: 'page_views',
      rowCount: 98210,
      createdAt: '2026-01-01',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
        { name: 'path', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
        { name: 'ip_address', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
        { name: 'user_agent', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
        { name: 'viewed_at', type: 'DATETIME', primaryKey: false, nullable: false, unique: false },
      ],
    },
    {
      name: 'daily_metrics',
      rowCount: 365,
      createdAt: '2026-01-01',
      columns: [
        { name: 'date', type: 'TEXT', primaryKey: true, nullable: false, unique: true },
        { name: 'total_visitors', type: 'INTEGER', primaryKey: false, nullable: false, unique: false },
        { name: 'avg_latency_ms', type: 'REAL', primaryKey: false, nullable: false, unique: false },
      ],
    },
  ],
  'users_auth.db': [
    {
      name: 'sessions',
      rowCount: 45,
      createdAt: '2026-02-01',
      columns: [
        { name: 'token', type: 'TEXT', primaryKey: true, nullable: false, unique: true },
        { name: 'user_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false },
        { name: 'expires_at', type: 'DATETIME', primaryKey: false, nullable: false, unique: false },
      ],
    },
  ],
  'test_memory.db': [
    {
      name: 'scratchpad',
      rowCount: 5,
      createdAt: '2026-08-28',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
        { name: 'note', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
      ],
    },
  ],
};

const mockTableDataStore: Record<string, Record<string, Record<string, any>[]>> = {
  'main.db': {
    users: [
      { id: 1, username: 'admin', email: 'admin@aeris.internal', role: 'admin', is_active: 1, created_at: '2026-01-10 10:00:00' },
      { id: 2, username: 'diama', email: 'diama@aeris.internal', role: 'developer', is_active: 1, created_at: '2026-01-10 10:05:00' },
      { id: 3, username: 'alice', email: 'alice@example.com', role: 'user', is_active: 1, created_at: '2026-01-12 14:20:00' },
      { id: 4, username: 'bob', email: 'bob@example.com', role: 'user', is_active: 0, created_at: '2026-01-15 09:11:00' },
      { id: 5, username: 'carol', email: 'carol@example.com', role: 'manager', is_active: 1, created_at: '2026-02-01 16:45:00' },
      { id: 6, username: 'david', email: 'david@example.com', role: 'user', is_active: 1, created_at: '2026-02-14 11:30:00' },
      { id: 7, username: 'eva', email: 'eva@example.com', role: 'user', is_active: 1, created_at: '2026-02-20 08:15:00' },
    ],
    orders: [
      { id: 101, user_id: 2, total_amount: 149.99, status: 'completed', created_at: '2026-02-10 12:00:00' },
      { id: 102, user_id: 3, total_amount: 49.50, status: 'completed', created_at: '2026-02-11 15:30:00' },
      { id: 103, user_id: 1, total_amount: 899.00, status: 'processing', created_at: '2026-02-15 09:00:00' },
      { id: 104, user_id: 5, total_amount: 29.99, status: 'pending', created_at: '2026-02-28 10:20:00' },
    ],
    products: [
      { id: 1, sku: 'AER-001', name: 'Aeris Enterprise Server License', price: 999.00, stock_quantity: 50 },
      { id: 2, sku: 'AER-002', name: 'High-Throughput WAL Engine Plugin', price: 299.00, stock_quantity: 120 },
      { id: 3, sku: 'AER-003', name: 'Embedded Web Console Pro', price: 149.00, stock_quantity: 300 },
      { id: 4, sku: 'AER-004', name: '24/7 Support SLA Tier 1', price: 499.00, stock_quantity: 10 },
    ],
    system_logs: [
      { id: 1001, level: 'INFO', message: 'Engine started in WAL mode on port 8080', timestamp: '2026-08-28 08:00:00' },
      { id: 1002, level: 'INFO', message: 'Mounted static assets from //go:embed dist', timestamp: '2026-08-28 08:00:01' },
      { id: 1003, level: 'WARN', message: 'Slow query detected: SELECT * FROM system_logs (execution: 14.2ms)', timestamp: '2026-08-28 08:15:22' },
      { id: 1004, level: 'INFO', message: 'Hot-swapped database context to main.db', timestamp: '2026-08-28 08:30:12' },
    ],
    webhooks: [
      { id: 1, event_type: 'ON_INSERT', target_url: 'https://api.diama.dev/hooks/user-created', is_enabled: 1 },
      { id: 2, event_type: 'ON_UPDATE', target_url: 'https://api.diama.dev/hooks/order-updated', is_enabled: 1 },
    ],
  },
  'analytics.db': {
    page_views: [
      { id: 1, path: '/dashboard', ip_address: '192.168.1.10', user_agent: 'Mozilla/5.0 Chrome/122.0', viewed_at: '2026-08-28 08:05:00' },
      { id: 2, path: '/editor', ip_address: '192.168.1.12', user_agent: 'Mozilla/5.0 Safari/17.2', viewed_at: '2026-08-28 08:06:12' },
    ],
    daily_metrics: [
      { date: '2026-08-27', total_visitors: 4820, avg_latency_ms: 2.4 },
      { date: '2026-08-28', total_visitors: 5190, avg_latency_ms: 1.8 },
    ],
  },
  'users_auth.db': {
    sessions: [
      { token: 'sess_9f83a21b', user_id: 1, expires_at: '2026-08-29 08:00:00' },
    ],
  },
  'test_memory.db': {
    scratchpad: [
      { id: 1, note: 'Testing multi-query execution speed' },
      { id: 2, note: 'Memory SQLite instance active' },
    ],
  },
};

export class ApiClient {
  static async fetchDatabases(): Promise<DatabaseInfo[]> {
    try {
      const res = await fetch('/api/v1/databases');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback to mock
    }
    return mockDatabases;
  }

  static async switchDatabase(dbName: string): Promise<{ success: boolean; activeDb: string }> {
    try {
      const res = await fetch('/api/v1/databases/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbName }),
      });
      if (res.ok) {
        activeDbName = dbName;
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }
    activeDbName = dbName;
    return { success: true, activeDb: dbName };
  }

  static async createDatabase(dbName: string, inMemory: boolean = false): Promise<DatabaseInfo> {
    const formattedName = dbName.endsWith('.db') ? dbName : `${dbName}.db`;
    try {
      const res = await fetch('/api/v1/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formattedName, inMemory }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }
    const newDb: DatabaseInfo = {
      name: formattedName,
      size: inMemory ? '0 KB (Memory)' : '4 KB',
      walMode: true,
      tableCount: 0,
      isInMemory: inMemory,
      lastModified: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    mockDatabases.push(newDb);
    initialSchemas[formattedName] = [];
    mockTableDataStore[formattedName] = {};
    activeDbName = formattedName;
    return newDb;
  }

  static async fetchSchemas(dbName: string = activeDbName): Promise<TableSchema[]> {
    try {
      const res = await fetch(`/api/v1/schema?db=${encodeURIComponent(dbName)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }
    return initialSchemas[dbName] || [];
  }

  static async executeQuery(sql: string, dbName: string = activeDbName): Promise<QueryResult> {
    const startTime = performance.now();
    try {
      const res = await fetch('/api/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql, database: dbName }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback mock SQL parser execution
    }

    const duration = +(performance.now() - startTime + Math.random() * 2 + 1.2).toFixed(2);
    const upperSQL = sql.trim().toUpperCase();

    // Mock simple SQL responses
    if (upperSQL.startsWith('SELECT')) {
      // Determine if a table name is in query
      const matchTable = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
      const tableName = matchTable ? matchTable[1] : null;

      if (tableName && mockTableDataStore[dbName]?.[tableName]) {
        const rows = mockTableDataStore[dbName][tableName];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return {
          columns,
          rows,
          executionTimeMs: duration,
          query: sql,
          timestamp: Date.now(),
        };
      }

      // Default dummy select return
      return {
        columns: ['id', 'result', 'status', 'version'],
        rows: [
          { id: 1, result: 'Query executed successfully', status: 'OK', version: 'Aeris Engine 1.0.0 (Go)' },
        ],
        executionTimeMs: duration,
        query: sql,
        timestamp: Date.now(),
      };
    }

    if (upperSQL.startsWith('CREATE TABLE')) {
      const matchName = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
      if (matchName) {
        const newTableName = matchName[1];
        const dbSchemas = initialSchemas[dbName] || [];
        if (!dbSchemas.find((s) => s.name === newTableName)) {
          dbSchemas.push({
            name: newTableName,
            rowCount: 0,
            createdAt: new Date().toISOString().substring(0, 10),
            columns: [
              { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false, unique: true },
              { name: 'created_at', type: 'DATETIME', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
            ],
          });
          initialSchemas[dbName] = dbSchemas;
          if (!mockTableDataStore[dbName]) mockTableDataStore[dbName] = {};
          mockTableDataStore[dbName][newTableName] = [];

          const dbInfo = mockDatabases.find((d) => d.name === dbName);
          if (dbInfo) dbInfo.tableCount = dbSchemas.length;
        }
      }

      return {
        columns: [],
        rows: [],
        executionTimeMs: duration,
        affectedRows: 0,
        query: sql,
        timestamp: Date.now(),
      };
    }

    if (upperSQL.startsWith('INSERT') || upperSQL.startsWith('UPDATE') || upperSQL.startsWith('DELETE') || upperSQL.startsWith('DROP')) {
      return {
        columns: [],
        rows: [],
        executionTimeMs: duration,
        affectedRows: Math.floor(Math.random() * 5) + 1,
        query: sql,
        timestamp: Date.now(),
      };
    }

    return {
      columns: ['status', 'message'],
      rows: [{ status: 'SUCCESS', message: 'DDL/DML Command processed by Aeris SQLite Engine' }],
      executionTimeMs: duration,
      affectedRows: 1,
      query: sql,
      timestamp: Date.now(),
    };
  }

  static async fetchTableData(
    tableName: string,
    dbName: string = activeDbName,
    filter?: string,
    sortCol?: string,
    sortDir: 'ASC' | 'DESC' = 'ASC'
  ): Promise<{ columns: string[]; rows: Record<string, any>[]; totalRows: number }> {
    try {
      const res = await fetch(`/api/v1/data?db=${encodeURIComponent(dbName)}&table=${encodeURIComponent(tableName)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }

    let rows = [...(mockTableDataStore[dbName]?.[tableName] || [])];
    const schemas = initialSchemas[dbName] || [];
    const schema = schemas.find((s) => s.name === tableName);
    const columns = schema ? schema.columns.map((c) => c.name) : rows.length > 0 ? Object.keys(rows[0]) : ['id'];

    if (filter && filter.trim()) {
      const term = filter.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((val) => String(val).toLowerCase().includes(term))
      );
    }

    if (sortCol) {
      rows.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (valA < valB) return sortDir === 'ASC' ? -1 : 1;
        if (valA > valB) return sortDir === 'ASC' ? 1 : -1;
        return 0;
      });
    }

    return {
      columns,
      rows,
      totalRows: rows.length,
    };
  }

  static async updateCell(
    tableName: string,
    pkColumn: string,
    pkValue: any,
    column: string,
    newValue: any,
    dbName: string = activeDbName
  ): Promise<boolean> {
    try {
      const res = await fetch('/api/v1/data/cell', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbName, tableName, pkColumn, pkValue, column, newValue }),
      });
      if (res.ok) return true;
    } catch (e) {
      // Fallback
    }

    const tableRows = mockTableDataStore[dbName]?.[tableName];
    if (tableRows) {
      const row = tableRows.find((r) => r[pkColumn] === pkValue);
      if (row) {
        row[column] = newValue;
        return true;
      }
    }
    return true;
  }

  static async insertRow(
    tableName: string,
    rowData: Record<string, any>,
    dbName: string = activeDbName
  ): Promise<Record<string, any>> {
    try {
      const res = await fetch('/api/v1/data/row', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbName, tableName, rowData }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // Fallback
    }

    const tableRows = mockTableDataStore[dbName]?.[tableName] || [];
    const newRow = { ...rowData };
    if (!newRow.id) {
      const maxId = tableRows.reduce((max, r) => (typeof r.id === 'number' && r.id > max ? r.id : max), 0);
      newRow.id = maxId + 1;
    }
    tableRows.push(newRow);
    mockTableDataStore[dbName][tableName] = tableRows;

    const schema = initialSchemas[dbName]?.find((s) => s.name === tableName);
    if (schema) schema.rowCount = tableRows.length;

    return newRow;
  }

  static async deleteRow(
    tableName: string,
    pkColumn: string,
    pkValue: any,
    dbName: string = activeDbName
  ): Promise<boolean> {
    try {
      const res = await fetch('/api/v1/data/row', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbName, tableName, pkColumn, pkValue }),
      });
      if (res.ok) return true;
    } catch (e) {
      // Fallback
    }

    if (mockTableDataStore[dbName]?.[tableName]) {
      mockTableDataStore[dbName][tableName] = mockTableDataStore[dbName][tableName].filter(
        (r) => r[pkColumn] !== pkValue
      );
      const schema = initialSchemas[dbName]?.find((s) => s.name === tableName);
      if (schema) schema.rowCount = mockTableDataStore[dbName][tableName].length;
    }
    return true;
  }

  static async fetchMetrics(): Promise<MetricsData> {
    try {
      const res = await fetch('/api/v1/metrics');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }

    // Dynamic mock real-time metric updates
    return {
      cpuUsage: +(12 + Math.random() * 18).toFixed(1),
      ramUsageMB: +(48.5 + Math.random() * 5.2).toFixed(1),
      qps: Math.floor(180 + Math.random() * 120),
      activeConnections: Math.floor(4 + Math.random() * 6),
      cacheHitRatio: 98.4,
      slowQueriesCount: 2,
      timestamp: Date.now(),
    };
  }
}
