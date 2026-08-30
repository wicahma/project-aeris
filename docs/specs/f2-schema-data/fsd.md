# Functional Specification: Schema & Data Management (F2)

## 1. Sub-Feature 1: Visual Schema Builder (DDL Without Manual SQL)

### SD-001: Visual Table Creation
- **Inputs**: `table_name` (string, required, regex `^[a-zA-Z_][a-zA-Z0-9_]*$`, max 64 chars), `description` (string, optional, max 255 chars).
- **Outputs**: Table metadata record, success notification `Table <table_name> created successfully`, rendered visual table card.
- **Control Logic**: Check name uniqueness against `tables_metadata` in current database. Send DDL payload to backend. Execute `CREATE TABLE` on target storage engine. On success, store schema metadata in bbolt/SQLite catalog.
- **Error Messages**:
  - `ERR_TABLE_EXISTS`: "Table with name '<table_name>' already exists."
  - `ERR_INVALID_NAME`: "Invalid table name. Use alphanumeric characters and underscores only."
- **Security**: Sanitization of table identifiers to prevent DDL injection.

### SD-002: Column Definition & Modification
- **Inputs**: `column_name` (string, required), `data_type` (enum: `INTEGER`, `TEXT`, `REAL`, `BLOB`, `DATETIME`), `is_primary_key` (boolean), `is_nullable` (boolean), `default_value` (string, nullable).
- **Outputs**: Column metadata entry, updated schema canvas node.
- **Control Logic**: Ensure exactly one primary key per table or composite primary key set. When altering existing tables, compile and run `ALTER TABLE ADD COLUMN` or schema migration transaction.
- **Error Messages**:
  - `ERR_PK_CONFLICT`: "Table already has a primary key defined."
  - `ERR_COLUMN_EXISTS`: "Column '<column_name>' already exists in table."
- **Data Handling**: Validate default values against specified `data_type`.

### SD-003: Visual Relationship & Foreign Key Builder
- **Inputs**: `from_table_id` (UUID), `from_column_name` (string), `to_table_id` (UUID), `to_column_name` (string), `on_delete` (`NO ACTION` | `CASCADE` | `SET NULL` | `RESTRICT`), `on_update` (`NO ACTION` | `CASCADE` | `SET NULL` | `RESTRICT`).
- **Outputs**: Visual connection edge on canvas, foreign key definition record.
- **Control Logic**: Validate source and target column data types match. Ensure target column has UNIQUE or PK constraint. Generate DDL foreign key constraint.
- **Error Messages**:
  - `ERR_TYPE_MISMATCH`: "Column types do not match for foreign key relation."
  - `ERR_TARGET_NOT_UNIQUE`: "Target column must have a primary key or unique constraint."
- **Security**: Verify user has schema modification permissions on target database.

---

## 2. Sub-Feature 2: CRUD Data Explorer

### SD-004: Data Grid View & Pagination
- **Inputs**: `table_name` (string), `page` (integer, min 1), `limit` (integer, default 50, max 500), `sort_by` (string), `sort_dir` (`ASC` | `DESC`), `filter_expression` (JSON structured filter).
- **Outputs**: Rows array (`data_rows`), total row count, page metadata, execution duration in ms.
- **Control Logic**: Parse structured filters into parameterized query. Execute indexed range scans where applicable. Return JSON serialized result set.
- **Error Messages**:
  - `ERR_TABLE_NOT_FOUND`: "Table '<table_name>' does not exist."
  - `ERR_QUERY_TIMEOUT`: "Data retrieval timed out after 5000ms."

### SD-005: Visual Row Insertion & Editing
- **Inputs**: `table_name` (string), `row_data` (key-value map of column values), `is_update` (boolean), `primary_key_val` (any, required if update).
- **Outputs**: Affected rows count (1), persisted row entity, toast `Row saved successfully`.
- **Control Logic**: Validate payload types and non-null constraints before transmission. If `is_update=false`, execute `INSERT INTO ...`. If `is_update=true`, execute `UPDATE ... WHERE pk = ?`.
- **Error Messages**:
  - `ERR_NOT_NULL_VIOLATION`: "Field '<column>' cannot be null."
  - `ERR_UNIQUE_VIOLATION`: "Value for '<column>' violates unique constraint."
  - `ERR_FK_NOT_FOUND`: "Foreign key constraint failed for column '<column>'."
- **Data Handling**: Auto-serialize complex types (JSON/BLOB) and enforce ISO-8601 formatting for DATETIME.

### SD-006: Visual Row Deletion
- **Inputs**: `table_name` (string), `primary_key_vals` (array of primary key identifiers).
- **Outputs**: Deleted count integer, updated data grid view.
- **Control Logic**: Execute batch `DELETE FROM <table> WHERE pk IN (...)`. Handle foreign key restrict errors.
- **Error Messages**:
  - `ERR_FK_RESTRICT`: "Cannot delete row because it is referenced by other tables."
- **Security**: Require explicit client confirmation dialog before firing batch delete.

---

## 3. Sub-Feature 3: Import/Export Data

### SD-007: Bulk Data Import
- **Inputs**: `target_table_id` (UUID), `source_format` (`CSV` | `JSON`), `file_stream` (binary/multipart), `column_mapping` (map of file field -> DB column), `batch_size` (integer, default 1000).
- **Outputs**: `import_job_id` (UUID), progress status updates via SSE/polling, final summary (rows imported, rows failed).
- **Control Logic**: Create `import_jobs` record with status `PENDING`. Stream file chunks into WAL-backed transaction blocks. Roll back transaction on parsing error if strict mode is enabled, or record offending rows in `error_log`.
- **Error Messages**:
  - `ERR_FILE_PARSE`: "Failed to parse <source_format> file at line <line_num>."
  - `ERR_FILE_TOO_LARGE`: "File exceeds maximum upload size (100MB)."
- **Data Handling**: Stream parsing to maintain constant memory footprint in Go runtime.

### SD-008: Bulk Data Export
- **Inputs**: `source_table_id` (UUID), `export_format` (`CSV` | `JSON` | `SQL_DUMP`), `include_schema` (boolean), `compression` (`NONE` | `GZIP`).
- **Outputs**: Downloadable file stream, `export_job_id` (UUID) status record.
- **Control Logic**: Initialize `export_jobs` record. Stream rows from bbolt/SQLite cursor directly to output buffer or temporary file. If `SQL_DUMP`, prepend DDL statements generated from `tables_metadata`, `columns_metadata`, and `indexes_metadata`.
- **Error Messages**:
  - `ERR_EXPORT_FAILED`: "Export generation failed: <error_detail>."
- **Security**: Validate export path permissions and enforce tenant isolation.

---

## 4. Sub-Feature 4: Index Management

### SD-009: Visual Index Creation
- **Inputs**: `table_id` (UUID), `index_name` (string, required, regex `^[a-zA-Z_][a-zA-Z0-9_]*$`), `column_names` (array of string, min 1), `is_unique` (boolean).
- **Outputs**: `indexes_metadata` record, success notification `Index <index_name> created`.
- **Control Logic**: Check index name uniqueness. Validate that columns exist in `columns_metadata`. Compile DDL `CREATE [UNIQUE] INDEX <index_name> ON <table> (<columns>)`. Execute against storage engine WAL.
- **Error Messages**:
  - `ERR_INDEX_EXISTS`: "Index '<index_name>' already exists."
  - `ERR_DUPLICATE_VALUES`: "Cannot create unique index: duplicate keys found in table."

### SD-010: Index Listing and Deletion
- **Inputs**: `table_id` (UUID), `index_id` (UUID, for delete action).
- **Outputs**: List of index objects (name, columns, uniqueness, size_bytes), deletion confirmation toast.
- **Control Logic**: Fetch index list from `indexes_metadata`. For drop operation, compile `DROP INDEX <index_name>`, execute DDL, and remove record from `indexes_metadata`.
- **Error Messages**:
  - `ERR_CANNOT_DROP_PRIMARY`: "Cannot drop primary key index."
  - `ERR_INDEX_NOT_FOUND`: "Index not found."
