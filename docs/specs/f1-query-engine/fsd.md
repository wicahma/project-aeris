# Functional Specification: Query Engine (F1)

## 1. Sub-Feature 1: Raw Query Editor

### QE-001: Multi-Tab CodeMirror 6 Editor Instance
- **Description**: Browser-based IDE query editor built with CodeMirror 6 supporting multiple concurrent query tabs, line numbers, active line highlighting, bracket matching, and code folding.
- **Inputs**:
  - `tab_id` (string/UUID, unique per open editor tab).
  - `tab_name` (string, default e.g. "Query 1", max 64 chars).
  - `raw_query_text` (string, UTF-8 SQL query text).
  - `target_database_id` (string/UUID, target database binding).
- **Outputs**:
  - Rendered CodeMirror 6 editor DOM instance.
  - Active tab state, cursor position `{line: number, col: number}`, text selection range.
- **Control Logic**:
  - Maintain an array of open tabs in frontend state, persisted to `localStorage` (`aeris_editor_tabs`).
  - Switching tabs mounts or activates the corresponding CodeMirror 6 state without losing cursor position or undo history.
  - Tab close prompts for confirmation if query text is dirty and unsaved.
  - Support creating new tabs (`+` button or `Ctrl+T`/`Cmd+T` shortcut).
- **Acceptance Criteria**:
  - CodeMirror 6 initializes within 50ms.
  - Editor displays line numbers, code folding widgets, bracket matching markers.
  - Tab switching preserves editor history (undo/redo stack).
  - Supports up to 20 concurrent tabs.
- **Error Handling & Messages**:
  - `ERR_MAX_TABS`: "Maximum number of query tabs (20) reached. Please close unused tabs."
  - `ERR_EMPTY_TAB_NAME`: "Tab name cannot be empty."
- **Security**: Client-side XSS sanitization on editor input rendering.

### QE-002: Query Execution & Execution Controls
- **Description**: Trigger query execution for entire document or currently highlighted selection via UI action or keyboard shortcuts (`Ctrl+Enter` / `Cmd+Enter`).
- **Inputs**:
  - `database_id` (string/UUID, required).
  - `query_text` (string, full query or highlighted selection substring).
  - `execution_mode` (`"all"` | `"selection"` | `"statement_at_cursor"`).
  - `timeout_ms` (integer, default 30000, max 300000).
- **Outputs**:
  - Execution status (`"executing"` | `"success"` | `"error"` | `"cancelled"`).
  - Query result payload: columns array, rows array, `rows_affected`, `execution_time_ms`, `query_id`.
  - Live execution indicator / spinner and elapsed execution timer.
- **Control Logic**:
  - Detect whether user has text selected: if selected, extract selection; otherwise extract current statement at cursor or entire buffer based on mode.
  - Generate client `execution_id` (UUIDv4) and dispatch POST request to `/api/v1/databases/{database_id}/query`.
  - AbortController attached to HTTP request for client-side cancellation.
  - On response, record entry into Query History and stream result to Result Data Grid.
- **Acceptance Criteria**:
  - Pressing `Cmd+Enter` or `Ctrl+Enter` triggers execution immediately.
  - If text is highlighted, only the highlighted SQL is executed.
  - Execution state is visually indicated with execution time counter.
  - Result set renders in < 200ms for payloads up to 5,000 rows.
- **Error Handling & Messages**:
  - `ERR_EMPTY_QUERY`: "Cannot execute empty query string."
  - `ERR_DB_NOT_SELECTED`: "No target database selected for execution."
  - `ERR_QUERY_TIMEOUT`: "Query execution exceeded timeout limit (<timeout_ms> ms)."
  - `ERR_EXECUTION_FAILED`: "Execution error [code]: <driver_error_message>."
- **Security**: Parameterized boundary validation; database access authorization check per request.

### QE-003: Query Execution Cancellation
- **Description**: Cancel an in-flight running query via UI "Cancel" button or `Escape` key.
- **Inputs**:
  - `database_id` (string/UUID).
  - `query_id` / `execution_id` (string/UUID).
- **Outputs**:
  - Cancelled query state notification: "Query execution cancelled by user."
  - Connection returned to idle in connection pool.
- **Control Logic**:
  - Client aborts fetch request via `AbortController.abort()`.
  - Client sends POST `/api/v1/databases/{database_id}/query/{execution_id}/cancel`.
  - Backend interrupts running storage engine context / bbolt reader transaction.
  - Query history status updated to `CANCELLED`.
- **Acceptance Criteria**:
  - Cancellation signal halts processing and unlocks UI within 500ms.
  - Editor returns to editable state immediately.
- **Error Handling & Messages**:
  - `ERR_CANCEL_FAILED`: "Unable to cancel query: already completed or process terminated."

### QE-004: SQL Formatting & Snippet Injection
- **Description**: Auto-format SQL query text according to standard dialect formatting rules and provide parameterized SQL snippets (e.g. `SELECT * FROM`, `CREATE TABLE`, `INSERT INTO`).
- **Inputs**:
  - `raw_sql` (string).
  - `indent_size` (integer, default 2).
  - `keyword_case` (`"UPPER"` | `"lower"`, default `"UPPER"`).
  - `snippet_key` (string, e.g. `"sel"`, `"ins"`, `"join"`).
- **Outputs**:
  - Formatted SQL string replacing editor selection or full document.
  - Injected template SQL with tab-stops for parameters.
- **Control Logic**:
  - Run client-side AST-based SQL formatter on `Ctrl+Shift+F` / `Cmd+Shift+F`.
  - Expand registered snippet triggers on `Tab` key press.
- **Acceptance Criteria**:
  - Formatting maintains comments, indentation, and clause alignment.
  - Formatting completes in < 50ms for queries under 1,000 lines.
- **Error Handling & Messages**:
  - `ERR_FORMAT_PARSE_SYNTAX`: "Cannot format query with syntax errors at line <line>, col <col>."

---

## 2. Sub-Feature 2: SQL Syntax Highlighting & Autocomplete

### QE-005: Real-time SQL Syntax Highlighting
- **Description**: Lexical and syntactic color-coding of SQL dialect keywords, identifiers, string literals, numbers, operators, and comments using CodeMirror 6 SQL extension.
- **Inputs**:
  - Editor text stream and cursor change events.
  - Active dialect configuration (Standard SQL / SQLite / bbolt dialect).
- **Outputs**:
  - Highlighted DOM tokens with designated CSS classes (e.g. `.cm-keyword`, `.cm-string`, `.cm-variable`, `.cm-number`, `.cm-comment`).
- **Control Logic**:
  - Parse stream via Lezer SQL parser.
  - Apply syntax highlighting theme matching dark/light Aeris UI palette.
  - Mark syntax error tokens with squiggly underlines.
- **Acceptance Criteria**:
  - Syntax highlighting updates at 60fps / zero noticeable typing latency (< 16ms).
  - Unclosed quotes and invalid tokens highlighted in error styling.
- **Error Handling & Messages**:
  - Fallback to plain text rendering if grammar parsing encounters unrecoverable syntax panics.

### QE-006: Context-Aware Schema Autocomplete (Keywords, Tables, Columns)
- **Description**: Real-time IntelliSense completion popup providing SQL keywords, table names, view names, column names, and aliases based on the active database schema and query context.
- **Inputs**:
  - Current cursor position and text token prefix.
  - Schema metadata cache for target database (`table_metadata`, `columns_metadata`).
  - AST context (e.g. after `FROM`/`JOIN` suggest tables; after `SELECT`/`WHERE` suggest columns of referenced tables; after `.` suggest columns of preceding table/alias).
- **Outputs**:
  - Autocomplete suggestion list with icons (`[K]` Keyword, `[T]` Table, `[C]` Column, `[F]` Function), type indicators, and description tooltips.
- **Control Logic**:
  - Fetch schema metadata from `/api/v1/databases/{database_id}/metadata` on DB switch or schema change, cached in memory / indexed client store.
  - Intercept CodeMirror `autocomplete` provider:
    1. Parse query prefix before cursor using SQL AST tokenizer.
    2. If cursor follows `FROM` or `JOIN`, prioritize table names.
    3. If cursor follows `<table_or_alias>.`, resolve table and list only matching columns.
    4. Otherwise, rank keywords, matching columns in all referenced tables, and global tables.
  - Trigger popup automatically on typing alphanumeric chars, `.` operator, or explicit `Ctrl+Space`.
- **Acceptance Criteria**:
  - Autocomplete dropdown renders within 20ms of trigger.
  - Table column filtering accurately resolves table aliases (e.g., `SELECT u.| FROM users u` suggests only columns of `users`).
  - Keyboard navigation (Up, Down, Enter, Tab, Esc) works seamlessly.
- **Error Handling & Messages**:
  - `WARN_METADATA_STALE`: Background refresh if metadata cache is empty or expired (> 5 minutes old).
- **Security**: Schema autocomplete is constrained to databases the user is authorized to inspect.

### QE-007: Metadata Cache Management for Autocomplete
- **Description**: Background synchronization and client-side indexing of database schema metadata (`table_metadata`, `columns_metadata`) to guarantee instantaneous autocomplete suggestions.
- **Inputs**:
  - `database_id` (string/UUID).
  - Schema change event / manual refresh action.
- **Outputs**:
  - Populated `table_metadata` and `columns_metadata` client cache.
  - Autocomplete engine index trie / token lookup table.
- **Control Logic**:
  - On database attach or selection, dispatch metadata fetch to backend catalog.
  - Store tables and columns in memory and mirror to client cache store.
  - Invalidate and refresh cache when DDL operations (`CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`) are executed.
- **Acceptance Criteria**:
  - Cache refresh handles schemas with up to 500 tables and 10,000 columns in < 100ms.
  - Metadata queries execute asynchronously without blocking editor input.
- **Error Handling & Messages**:
  - `ERR_METADATA_FETCH`: "Failed to load database schema metadata for autocomplete."

---

## 3. Sub-Feature 3: Query History & Saved Queries

### QE-008: Automated Query History Logging
- **Description**: Persist every executed query with execution metadata (SQL statement, timestamp, execution duration, status, affected row count, error message) to internal persistence storage.
- **Inputs**:
  - `database_id` (string/UUID, required).
  - `query_text` (string, required).
  - `status` (`"SUCCESS"` | `"FAILED"` | `"CANCELLED"`).
  - `execution_duration_ms` (integer).
  - `rows_affected` (integer).
  - `error_message` (string, nullable).
- **Outputs**:
  - Persisted record in `queries` (history) table.
  - Updated Query History side panel list.
- **Control Logic**:
  - Upon query execution completion in Go backend or frontend bridge, insert record into `queries` entity in internal metadata store (with fallback to client `localStorage`/IndexedDB if operating in decoupled standalone mode).
  - Query History UI displays entries sorted by `executed_at DESC`.
  - Cap query history at configured limit (e.g. 1,000 entries per database) using FIFO eviction.
- **Acceptance Criteria**:
  - History entry created for every execution attempt within 10ms of completion.
  - Clicking any history item restores the SQL query text into the active editor tab.
- **Error Handling & Messages**:
  - `ERR_HISTORY_WRITE_FAILED`: "Warning: Unable to save query execution to history log."
- **Security**: Sanitize sensitive credential patterns (e.g. `IDENTIFIED BY '...'`) before persisting to query history.

### QE-009: Query History Filtering, Search & Management
- **Description**: Search, filter, inspect, rerun, or clear past query executions.
- **Inputs**:
  - `search_query` (string, matches SQL text or error message).
  - `status_filter` (`"ALL"` | `"SUCCESS"` | `"FAILED"` | `"CANCELLED"`).
  - `date_range` (`start_time`, `end_time`).
  - `limit` (integer, default 50), `offset` (integer, default 0).
- **Outputs**:
  - Filtered list of history records with status badge, execution time, timestamp, and query snippet.
  - Clear history confirmation modal.
- **Control Logic**:
  - Query indexed `queries` table with `WHERE database_id = ? AND query_text LIKE ?`.
  - UI provides one-click "Copy to Editor", "Rerun", and "Delete Entry" buttons.
  - "Clear All History" executes batch deletion for selected database.
- **Acceptance Criteria**:
  - Search filters update results in < 50ms for 1,000+ history records.
  - Batch deletion clears records and refreshes the panel immediately.
- **Error Handling & Messages**:
  - `ERR_HISTORY_NOT_FOUND`: "Query history record not found."

### QE-010: Saved Queries CRUD & Categorization
- **Description**: Save reusable queries with custom titles, descriptions, tags/folders, and optional parameter placeholders for quick execution and team sharing.
- **Inputs**:
  - `title` (string, required, max 128 chars).
  - `query_text` (string, required).
  - `database_id` (string/UUID, nullable if cross-database template).
  - `description` (string, optional, max 512 chars).
  - `folder_tag` (string, default "General", max 64 chars).
  - `is_favorite` (boolean, default false).
- **Outputs**:
  - Saved query entity record in `saved_queries` table.
  - Rendered entry in Saved Queries panel under designated folder/tag.
- **Control Logic**:
  - Validate required fields `title` and `query_text`.
  - On create/update, persist to `saved_queries` table with updated timestamp.
  - Support inline tag/folder management to group saved snippets.
  - Support "Run Saved Query" which opens a new tab and auto-fills the SQL text.
- **Acceptance Criteria**:
  - Saved query created, updated, and deleted with immediate UI synchronization.
  - Favoriting pins query to top of Saved Queries sidebar.
- **Error Handling & Messages**:
  - `ERR_TITLE_REQUIRED`: "Saved query title is required."
  - `ERR_DUPLICATE_TITLE`: "A saved query with this title already exists in folder '<folder>'."
- **Data Handling**: Parameter placeholders formatted as `{{param_name}}` prompt user with input modal before execution.

---

## 4. Sub-Feature 4: Result Data Grid

### QE-011: Tabular Result Set Visualization
- **Description**: High-performance virtualized data grid for rendering query result sets with dynamic column type detection, row indices, and status footer (total rows, affected rows, execution duration).
- **Inputs**:
  - `columns` (array of column schema objects: `name`, `data_type`, `nullable`).
  - `rows` (array of row objects or value arrays).
  - `execution_stats` (`duration_ms`, `rows_count`, `rows_affected`).
- **Outputs**:
  - Interactive virtualized table UI with sticky column headers and sticky row numbers.
  - Status bar summary string: e.g. "500 rows retrieved in 14.2ms (10,000 rows total)".
- **Control Logic**:
  - Use DOM virtualization (rendering only visible window of rows + buffer) to maintain 60fps scrolling on result sets up to 50,000 rows.
  - Column header displays column name and inferred type icon (`123`, `ABC`, `📅`, `{ }`, `0101`).
  - Null values rendered distinctly with italicized badge `<null>`.
- **Acceptance Criteria**:
  - Initial render of 10,000 rows completes in < 150ms.
  - Smooth 60fps vertical and horizontal scrolling without layout jitter.
- **Error Handling & Messages**:
  - `INFO_EMPTY_RESULT`: "Query executed successfully. 0 rows returned."
  - `INFO_NON_QUERY_SUCCESS`: "Statement executed successfully. <rows_affected> rows affected in <duration_ms>ms."

### QE-012: Client-Side Column Sorting & Filtering
- **Description**: Interactive per-column sorting (Ascending, Descending, Clear) and multi-column filter predicates without re-executing query against backend storage.
- **Inputs**:
  - `sort_column` (string), `sort_direction` (`"ASC"` | `"DESC"` | `null`).
  - `column_filters` (map of `column_name` -> filter condition: `{operator: "equals" | "contains" | "gt" | "lt" | "is_null" | "starts_with", value: any}`).
- **Outputs**:
  - Filtered and sorted data rows view.
  - Active sort/filter indicator chips on column headers.
- **Control Logic**:
  - Type-aware sorting: numeric comparison for integers/floats, lexicographical for strings, timestamp comparison for ISO dates.
  - Apply composite filtering across all active column filters.
  - Maintain original unfiltered dataset in memory to allow instant filter reset.
- **Acceptance Criteria**:
  - Sorting/filtering 10,000 in-memory rows completes in < 30ms.
  - Multi-column sort hierarchy clearly indicated in UI.
- **Error Handling & Messages**:
  - `ERR_INVALID_FILTER_VALUE`: "Filter value incompatible with column data type <data_type>."

### QE-013: Pagination & Chunked Data Browsing
- **Description**: Configurable pagination controls (page size selector: 25, 50, 100, 250, 500, All) and fast page navigation controls with row range indicators.
- **Inputs**:
  - `current_page` (integer, min 1).
  - `page_size` (integer, default 50).
  - `total_rows` (integer).
- **Outputs**:
  - Paginated row slice for current page view.
  - Pagination navigation bar (`First`, `Prev`, `Page X of Y`, `Next`, `Last`, `Jump to page`).
- **Control Logic**:
  - Calculate `slice_start = (current_page - 1) * page_size` and `slice_end = min(slice_start + page_size, total_rows)`.
  - Recalculate page count dynamically when filters are applied.
  - Support infinite scroll / virtual windowing toggle as user preference.
- **Acceptance Criteria**:
  - Changing page size or jumping to page executes instantly (< 5ms).
  - Pagination controls automatically disable at boundary conditions (page 1 or last page).
- **Error Handling & Messages**:
  - `ERR_OUT_OF_BOUNDS_PAGE`: "Requested page exceeds available page count."

### QE-014: Cell Inspection, Copy & Data Export
- **Description**: Detail inspection modal for large cell content (JSON, long TEXT, BLOB/Binary hex view), single-cell or selected-range clipboard copy, and export of current result set to CSV, JSON, or TSV.
- **Inputs**:
  - `selected_cell` / `selected_range` (cell coordinates `[row, col]`).
  - `export_format` (`"CSV"` | `"JSON"` | `"TSV"` | `"MARKDOWN"`).
  - `export_scope` (`"all_pages"` | `"current_page"` | `"selected_rows"`).
- **Outputs**:
  - Formatted cell detail drawer/modal (with JSON pretty-printing).
  - Downloadable file stream or clipboard write confirmation toast.
- **Control Logic**:
  - Double clicking cell opens cell viewer with formatted JSON / markdown view.
  - `Ctrl+C` / `Cmd+C` on selected cells copies formatted TSV/CSV to clipboard.
  - Export action serializes active filtered/sorted dataset and triggers browser download via `Blob` object URL.
- **Acceptance Criteria**:
  - Cell modal renders complex JSON objects with syntax coloring and collapsible keys.
  - CSV export escapes quotes, commas, and newlines per RFC 4180.
- **Error Handling & Messages**:
  - `ERR_CLIPBOARD_DENIED`: "Clipboard access denied by browser permissions."
  - `ERR_EXPORT_GENERATION`: "Failed to generate export file: <error_detail>."

### QE-015: Result Set Caching & Query Result Retention
- **Description**: Cache recent query execution result sets in internal store or client cache to enable instant tab switching, fast pagination, and offline review without re-executing expensive queries.
- **Inputs**:
  - `query_id` (string/UUID).
  - `cache_key` (hash of `database_id` + normalized `query_text`).
  - `result_payload` (columns, rows, execution stats).
  - `ttl_seconds` (integer, default 1800 [30 minutes]).
- **Outputs**:
  - Cached result record in `query_results_cache`.
  - Cache status flag (`"HIT"` | `"MISS"` | `"EXPIRED"`).
- **Control Logic**:
  - When query completes, serialize and store result in `query_results_cache` with timestamp and TTL.
  - Tab switching checks cache by `query_id` or `cache_key`: if valid and not expired, hydrate grid instantly.
  - Evict expired cache entries periodically or on memory threshold (> 50MB).
- **Acceptance Criteria**:
  - Restoring cached result renders in < 30ms.
  - Cache properly expires after TTL or upon explicit user cache invalidation.
- **Error Handling & Messages**:
  - `WARN_CACHE_EVICTED`: "Cached result set was evicted; re-execution required."
