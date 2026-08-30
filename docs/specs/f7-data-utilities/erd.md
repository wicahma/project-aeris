# Entity Relationship Diagram (ERD): Data Utilities (F7)

## 1. Visual Schema Diagram

```mermaid
erDiagram
    DATABASES ||--o{ BACKUP_SCHEDULES : "defines"
    DATABASES ||--o{ BACKUP_FILES : "produced_from"
    DATABASES ||--o{ BACKUP_HISTORY : "logged_for"
    BACKUP_SCHEDULES ||--o{ BACKUP_FILES : "triggers"
    BACKUP_FILES ||--o{ BACKUP_HISTORY : "records"
    DATABASES ||--o{ SEARCH_INDEX_METADATA : "indexed_for"
    DATABASES ||--o{ SEARCH_QUERIES_LOG : "searched_in"

    BACKUP_SCHEDULES {
        string id PK "UUIDv4"
        string database_id FK "NOT NULL"
        string cron_expression TEXT "NOT NULL"
        string storage_type TEXT "LOCAL|S3"
        string storage_path TEXT "NOT NULL"
        integer retention_days INTEGER "DEFAULT 30"
        integer is_enabled INTEGER "NOT NULL DEFAULT 1"
        integer next_run_at INTEGER "unix_ms"
        integer created_at INTEGER "unix_ms"
        integer updated_at INTEGER "unix_ms"
    }

    BACKUP_FILES {
        string id PK "UUIDv4"
        string database_id FK "NOT NULL"
        string schedule_id FK "NULLABLE for manual"
        string file_path TEXT "NOT NULL"
        string file_hash TEXT "sha256"
        integer file_size_bytes INTEGER "NOT NULL"
        integer compression_type TEXT "NONE|GZIP|LZ4"
        string status TEXT "PENDING|COMPLETED|FAILED"
        string error_message TEXT "NULLABLE"
        integer started_at INTEGER "unix_ms"
        integer completed_at INTEGER "unix_ms"
    }

    BACKUP_HISTORY {
        string id PK "UUIDv4"
        string database_id FK "NOT NULL"
        string backup_file_id FK "NOT NULL"
        string operation TEXT "BACKUP|RESTORE|VERIFY"
        string status TEXT "SUCCESS|FAILED|PARTIAL"
        integer duration_ms INTEGER "NOT NULL"
        string error_message TEXT "NULLABLE"
        integer created_at INTEGER "unix_ms"
    }

    SEARCH_INDEX_METADATA {
        string id PK "UUIDv4"
        string database_id FK "NOT NULL"
        string table_name TEXT "NOT NULL"
        string column_name TEXT "NOT NULL"
        string fts_table_name TEXT "hidden fts5 table"
        integer row_count INTEGER "DEFAULT 0"
        integer last_synced_at INTEGER "unix_ms"
        integer created_at INTEGER "unix_ms"
    }

    SEARCH_QUERIES_LOG {
        string id PK "UUIDv4"
        string database_id FK "NOT NULL"
        string query_text TEXT "NOT NULL"
        string tables_searched TEXT "JSON array"
        integer results_count INTEGER "NOT NULL"
        integer execution_time_ms INTEGER "NOT NULL"
        integer created_at INTEGER "unix_ms"
    }
```

## 2. Entity Definitions & Production Attributes

### Entity: `backup_schedules` (Scheduled Backup Definitions)

| Column | Type | Constraint | Index |
|--------|------|-----------|-------|
| id | TEXT (UUIDv4) | PRIMARY KEY | — |
| database_id | TEXT (UUID) | NOT NULL, FK -> databases(id) ON DELETE CASCADE | `idx_backup_schedules_db` |
| cron_expression | TEXT | NOT NULL | `idx_backup_schedules_cron` |
| storage_type | TEXT | NOT NULL, CHECK IN ('LOCAL','S3') | — |
| storage_path | TEXT | NOT NULL | — |
| retention_days | INTEGER | NOT NULL, DEFAULT 30, >= 1 | — |
| is_enabled | INTEGER | NOT NULL, DEFAULT 0 | — |
| next_run_at | INTEGER | NULLABLE (unix ms) | `idx_backup_schedules_next_run` |
| created_at | INTEGER | NOT NULL (unix ms) | — |
| updated_at | INTEGER | NOT NULL (unix ms) | — |

**Relationships**: `backup_schedules` N:1 → `databases`, `backup_schedules` 1:N → `backup_files`.
**Constraints**: `CHECK (retention_days >= 1)`, `CHECK (is_enabled IN (0,1))`, `CHECK (storage_type IN ('LOCAL','S3'))`.
**Indexes**: `(database_id, is_enabled, next_run_at)` for the scheduler daemon query.

---

### Entity: `backup_files` (Snapshot Artifacts on Disk)

| Column | Type | Constraint | Index |
|--------|------|-----------|-------|
| id | TEXT (UUIDv4) | PRIMARY KEY | — |
| database_id | TEXT (UUID) | NOT NULL, FK -> databases(id) ON DELETE CASCADE | `idx_backup_files_db` |
| schedule_id | TEXT (UUID) | NULLABLE, FK -> backup_schedules(id) ON DELETE SET NULL | `idx_backup_files_schedule` |
| file_path | TEXT | NOT NULL, UNIQUE | `idx_backup_files_path` |
| file_hash | TEXT | NOT NULL (sha256) | — |
| file_size_bytes | INTEGER | NOT NULL, >= 0 | — |
| compression_type | TEXT | NOT NULL, CHECK IN ('NONE','GZIP','LZ4') | — |
| status | TEXT | NOT NULL, CHECK IN ('PENDING','COMPLETED','FAILED') | `idx_backup_files_status` |
| error_message | TEXT | NULLABLE | — |
| started_at | INTEGER | NOT NULL (unix ms) | — |
| completed_at | INTEGER | NULLABLE (unix ms) | — |

**Relationships**: `backup_files` N:1 → `databases`, `backup_files` N:1 → `backup_schedules` (NULL for manual snapshots), `backup_files` 1:1 → `backup_history`.
**Constraints**: `UNIQUE (file_path)`, `CHECK (file_size_bytes >= 0)`, `CHECK (compression_type IN ('NONE','GZIP','LZ4'))`.
**Indexes**: `(database_id, started_at DESC)` for listing recent backups per database.

---

### Entity: `backup_history` (Operation Log for Backup Events)

| Column | Type | Constraint | Index |
|--------|------|-----------|-------|
| id | TEXT (UUIDv4) | PRIMARY KEY | — |
| database_id | TEXT (UUID) | NOT NULL, FK -> databases(id) ON DELETE CASCADE | `idx_backup_history_db` |
| backup_file_id | TEXT (UUID) | NOT NULL, FK -> backup_files(id) ON DELETE CASCADE | `idx_backup_history_file` |
| operation | TEXT | NOT NULL, CHECK IN ('BACKUP','RESTORE','VERIFY') | `idx_backup_history_op` |
| status | TEXT | NOT NULL, CHECK IN ('SUCCESS','FAILED','PARTIAL') | `idx_backup_history_status` |
| duration_ms | INTEGER | NOT NULL, >= 0 | — |
| error_message | TEXT | NULLABLE | — |
| created_at | INTEGER | NOT NULL (unix ms) | `idx_backup_history_created` |

**Relationships**: `backup_history` N:1 → `backup_files`, `backup_history` N:1 → `databases`.
**Constraints**: `CHECK (duration_ms >= 0)`, `CHECK (operation IN ('BACKUP','RESTORE','VERIFY'))`.
**Indexes**: `(database_id, operation, created_at DESC)` for the audit trail panel.

---

### Entity: `search_index_metadata` (FTS Index Registry)

| Column | Type | Constraint | Index |
|--------|------|-----------|-------|
| id | TEXT (UUIDv4) | PRIMARY KEY | — |
| database_id | TEXT (UUID) | NOT NULL, FK -> databases(id) ON DELETE CASCADE | `idx_search_index_db` |
| table_name | TEXT | NOT NULL | `idx_search_index_table` |
| column_name | TEXT | NOT NULL | — |
| fts_table_name | TEXT | NOT NULL, UNIQUE | — |
| row_count | INTEGER | NOT NULL, DEFAULT 0 | — |
| last_synced_at | INTEGER | NULLABLE (unix ms) | — |
| created_at | INTEGER | NOT NULL (unix ms) | — |

**Relationships**: `search_index_metadata` N:1 → `databases`.
**Constraints**: `UNIQUE (database_id, table_name, column_name)` — one index per column per table.
**Indexes**: `(database_id, table_name)` for listing indexes per table, `(last_synced_at)` for maintenance tasks.

---

### Entity: `search_queries_log` (FTS Query Audit)

| Column | Type | Constraint | Index |
|--------|------|-----------|-------|
| id | TEXT (UUIDv4) | PRIMARY KEY | — |
| database_id | TEXT (UUID) | NOT NULL, FK -> databases(id) ON DELETE CASCADE | `idx_search_log_db` |
| query_text | TEXT | NOT NULL | — |
| tables_searched | TEXT | NOT NULL (JSON array, e.g. `["users","posts"]`) | — |
| results_count | INTEGER | NOT NULL, >= 0 | — |
| execution_time_ms | INTEGER | NOT NULL, >= 0 | — |
| created_at | INTEGER | NOT NULL (unix ms) | `idx_search_log_created` |

**Relationships**: `search_queries_log` N:1 → `databases`.
**Constraints**: `CHECK (results_count >= 0)`, `CHECK (execution_time_ms >= 0)`.
**Indexes**: `(database_id, created_at DESC)` for the search history panel.

---

## 3. Relationship Summary

| Relationship | Cardinality | Description |
|-------------|-------------|-------------|
| `databases` → `backup_schedules` | 1:N | One database has many scheduled backup definitions |
| `databases` → `backup_files` | 1:N | One database produces many snapshot files |
| `databases` → `backup_history` | 1:N | One database has many backup operation logs |
| `databases` → `search_index_metadata` | 1:N | One database has many FTS-enabled columns |
| `databases` → `search_queries_log` | 1:N | One database has many logged search queries |
| `backup_schedules` → `backup_files` | 1:N | One schedule triggers many backup files over time |
| `backup_files` → `backup_history` | 1:1 | Each backup file has exactly one history entry |
| `search_index_metadata` → `databases` | N:1 | Each index belongs to one database |
| `search_queries_log` → `databases` | N:1 | Each search log entry belongs to one database |
