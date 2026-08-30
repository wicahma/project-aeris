# Entity Relationship Diagram (ERD): Query Engine (F1)

## 1. Visual Schema Diagram

```mermaid
erDiagram
    DATABASES ||--o{ QUERIES : "executes"
    DATABASES ||--o{ SAVED_QUERIES : "references"
    DATABASES ||--o{ QUERY_RESULTS_CACHE : "cached_for"
    DATABASES ||--o{ TABLES_METADATA : "contains"
    TABLES_METADATA ||--o{ COLUMNS_METADATA : "columns_of"
    TABLES_METADATA ||--o{ INDEXES_METADATA : "optimized_by"

    QUERIES {
        string id PK "UUIDv4"
        string database_id FK "NOT NULL"
        string query_text TEXT "NOT NULL"
        string status TEXT "SUCCESS|FAILED|CANCELLED"
        integer execution_duration_ms INTEGER "NOT NULL"
        integer rows_affected INTEGER "NOT NULL DEFAULT 0"
        integer rows_returned INTEGER "NOT NULL DEFAULT 0"
        string error_message TEXT "NULLABLE"
        integer executed_at INTEGER "NOT NULL unix_ms"
        string execution_id TEXT "UUIDv4 unique per execution"
    }

    SAVED_QUERIES {
        string id PK "UUIDv4"
        string database_id FK "NULLABLE cross-db templates"
        string title TEXT "NOT NULL max 128 chars"
        string description TEXT "NULLABLE max 512 chars"
        string query_text TEXT "NOT NULL"
        string folder_tag TEXT "NOT NULL DEFAULT 'General'"
        integer is_favorite INTEGER "NOT NULL DEFAULT 0"
        integer created_at INTEGER "NOT NULL unix_ms"
        integer updated_at INTEGER "NOT NULL unix_ms"
    }

    QUERY_RESULTS_CACHE {
        string id PK "UUIDv4"
        string query_id FK "references QUERIES.id"
        string cache_key TEXT "NOT NULL sha256(db+sql)"
        string database_id FK "NOT NULL"
        blob columns_json TEXT "NOT NULL"
        blob rows_json TEXT "NOT NULL"
        integer rows_count INTEGER "NOT NULL"
        integer execution_duration_ms INTEGER "NOT NULL"
        integer ttl_seconds INTEGER "NOT NULL DEFAULT 1800"
        integer created_at INTEGER "NOT NULL unix_ms"
        integer expires_at INTEGER "NOT NULL unix_ms"
    }

    TABLES_METADATA {
        string id PK "UUIDv4"
        string database_id FK "NOT NULL"
        string name TEXT "NOT NULL"
        string description TEXT "NULLABLE"
        integer row_count INTEGER "NOT NULL DEFAULT 0"
        integer created_at INTEGER "NOT NULL unix_ms"
        integer updated_at INTEGER "NOT NULL unix_ms"
    }

    COLUMNS_METADATA {
        string id PK "UUIDv4"
        string table_id FK "NOT NULL"
        string name TEXT "NOT NULL"
        string data_type TEXT "NOT NULL"
        integer is_primary_key INTEGER "NOT NULL DEFAULT 0"
        integer is_nullable INTEGER "NOT NULL DEFAULT 1"
        string default_value TEXT "NULLABLE"
        integer position INTEGER "NOT NULL"
        integer created_at INTEGER "NOT NULL unix_ms"
    }

    INDEXES_METADATA {
        string id PK "UUIDv4"
        string table_id FK "NOT NULL"
        string name TEXT "NOT NULL"
        string column_names TEXT "JSON array NOT NULL"
        integer is_unique INTEGER "NOT NULL DEFAULT 0"
        integer created_at INTEGER "NOT NULL unix_ms"
    }
```

## 2. Entity Definitions & Production Attributes

### Entity: `queries` (Query Execution History)

| Column | Type | Constraint | Index |
|--------|------|-----------|-------|
| id | TEXT (UUIDv4) | PRIMARY KEY | — |
| database_id | TEXT (UUID) | NOT NULL, FK -> databases(id) ON DELETE CASCADE | `idx_queries_db` |
| query_text | TEXT | NOT NULL | — |
| status | TEXT | NOT NULL, CHECK IN ('SUCCESS','FAILED','CANCELLED') | `idx_queries_status` |
| execution_duration_ms | INTEGER | NOT NULL, >= 0 | — |
| rows_affected | INTEGER | NOT NULL, DEFAULT 0 | — |
| rows_returned | INTEGER | NOT NULL, DEFAULT 0 | — |
| error_message | TEXT | NULLABLE | — |
| executed_at | INTEGER | NOT NULL (unix ms) | `idx_queries_executed_at` |
| execution_id | TEXT (UUIDv4) | NOT NULL, UNIQUE | `idx_queries_execution_id` |

**Relationships**: `queries` N:1 → `databases` (each history entry belongs to one database)
**Constraints**: `CHECK (execution_duration_ms >= 0)`
**Indexes**: Composite index `(database_id, executed_at DESC)` for efficient history panel queries ordered by recency.

---

### Entity: `saved_queries` (User-Saved Reusable Queries)

| Column | Type | Constraint | Index |
|--------|------|-----------|-------|
| id | TEXT (UUIDv4) | PRIMARY KEY | — |
| database_id | TEXT (UUID) | NULLABLE, FK -> databases(id) ON DELETE SET NULL | `idx_saved_queries_db` |
| title | TEXT | NOT NULL, max 128 chars | — |
| description | TEXT | NULLABLE, max 512 chars | — |
| query_text | TEXT | NOT NULL | — |
| folder_tag | TEXT | NOT NULL, DEFAULT 'General' | `idx_saved_queries_folder` |
| is_favorite | INTEGER | NOT NULL, DEFAULT 0 | `idx_saved_queries_fav` |
| created_at | INTEGER | NOT NULL (unix ms) | — |
| updated_at | INTEGER | NOT NULL (unix ms) | — |

**Relationships**: `saved_queries` N:1 → `databases` (optional; NULL for cross-database templates)
**Constraints**: `CHECK (title != '')`, `UNIQUE (folder_tag, title)` for logical dedup per folder.
**Indexes**: Composite index `(folder_tag, is_favorite DESC, title ASC)` for panel rendering.

---

### Entity: `query_results_cache` (Cached Query Result Sets)

| Column | Type | Constraint | Index |
|--------|------|-----------|-------|
| id | TEXT (UUIDv4) | PRIMARY KEY | — |
| query_id | TEXT (UUID) | NOT NULL, FK -> queries(id) ON DELETE CASCADE | `idx_cache_query` |
| cache_key | TEXT | NOT NULL, UNIQUE | `idx_cache_key` |
| database_id | TEXT (UUID) | NOT NULL, FK -> databases(id) ON DELETE CASCADE | `idx_cache_db` |
| columns_json | TEXT | NOT NULL | — |
| rows_json | TEXT | NOT NULL | — |
| rows_count | INTEGER | NOT NULL | — |
| execution_duration_ms | INTEGER | NOT NULL | — |
| ttl_seconds | INTEGER | NOT NULL, DEFAULT 1800 | — |
| created_at | INTEGER | NOT NULL (unix ms) | — |
| expires_at | INTEGER | NOT NULL (unix ms) | `idx_cache_expires` |

**Relationships**: `query_results_cache` N:1 → `queries` (each cache entry belongs to one query history entry)
**Constraints**: `CHECK (ttl_seconds > 0)`, `CHECK (expires_at > created_at)`, `cache_key` is `SHA256(normalized_sql + database_id)`.
**Indexes**: `idx_cache_expires` used by background eviction job: `DELETE FROM query_results_cache WHERE expires_at < now OR cache_key NOT IN active_keys`.
**Eviction policy**: LRU on cache_key with hard cap of 50MB total or 500 entries.

---

### Entity: `table_metadata` (Schema Autocomplete Source)

| Column | Type | Constraint | Index |
|--------|------|-----------|-------|
| id | TEXT (UUIDv4) | PRIMARY KEY | — |
| database_id | TEXT (UUID) | NOT NULL, FK -> databases(id) ON DELETE CASCADE | — |
| name | TEXT | NOT NULL | — |
| description | TEXT | NULLABLE | — |
| row_count | INTEGER | NOT NULL, DEFAULT 0 | — |
| created_at | INTEGER | NOT NULL (unix ms) | — |
| updated_at | INTEGER | NOT NULL (unix ms) | — |

**Relationships**: `table_metadata` N:1 → `databases`, `table_metadata` 1:N → `columns_metadata`, `table_metadata` 1:N → `indexes_metadata`
**Constraints**: `UNIQUE (database_id, name)` — table names unique per database.
**Indexes**: `(database_id, name)` unique for fast autocomplete lookup.

---

### Entity: `columns_metadata` (Column Schema for Autocomplete)

| Column | Type | Constraint | Index |
|--------|------|-----------|-------|
| id | TEXT (UUIDv4) | PRIMARY KEY | — |
| table_id | TEXT (UUID) | NOT NULL, FK -> table_metadata(id) ON DELETE CASCADE | `idx_columns_table` |
| name | TEXT | NOT NULL | — |
| data_type | TEXT | NOT NULL, CHECK IN ('INTEGER','TEXT','REAL','BLOB','DATETIME') | — |
| is_primary_key | INTEGER | NOT NULL, DEFAULT 0 | — |
| is_nullable | INTEGER | NOT NULL, DEFAULT 1 | — |
| default_value | TEXT | NULLABLE | — |
| position | INTEGER | NOT NULL | — |
| created_at | INTEGER | NOT NULL (unix ms) | — |

**Relationships**: `columns_metadata` N:1 → `table_metadata` (each column belongs to one table)
**Constraints**: `UNIQUE (table_id, name)`, `CHECK (is_nullable IN (0,1))`, `CHECK (is_primary_key IN (0,1))`.
**Indexes**: Composite index `(table_id, position)` for ordered schema rendering.

---

### Entity: `indexes_metadata` (Index Schema for Autocomplete & Info)

| Column | Type | Constraint | Index |
|--------|------|-----------|-------|
| id | TEXT (UUIDv4) | PRIMARY KEY | — |
| table_id | TEXT (UUID) | NOT NULL, FK -> table_metadata(id) ON DELETE CASCADE | `idx_meta_indexes_table` |
| name | TEXT | NOT NULL | — |
| column_names | TEXT | NOT NULL (JSON array, e.g. `["col1","col2"]`) | — |
| is_unique | INTEGER | NOT NULL, DEFAULT 0 | — |
| created_at | INTEGER | NOT NULL (unix ms) | — |

**Relationships**: `indexes_metadata` N:1 → `table_metadata`
**Constraints**: `UNIQUE (table_id, name)`, `CHECK (is_unique IN (0,1))`.
**Indexes**: `(table_id, name)` unique.

---

## 3. Relationship Summary

| Relationship | Cardinality | Description |
|-------------|-------------|-------------|
| `databases` → `queries` | 1:N | One database has many query history entries |
| `databases` → `saved_queries` | 1:N | One database has many saved queries (optional) |
| `databases` → `query_results_cache` | 1:N | One database has many cached result sets |
| `databases` → `table_metadata` | 1:N | One database has many tables |
| `table_metadata` → `columns_metadata` | 1:N | One table has many columns |
| `table_metadata` → `indexes_metadata` | 1:N | One table has many indexes |
| `queries` → `query_results_cache` | 1:N | One query execution can have one cache entry |
