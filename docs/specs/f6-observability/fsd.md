# Functional Specification: Observability (F6)

Scope: real-time system telemetry and query performance introspection for Project Aeris
(Go single-binary DBMS, React+TS embedded UI, bbolt + WAL per-database `.db` files).

Two sub-features:
1. **Real-time Performance Dashboard** — live CPU, RAM, active connections, QPS.
2. **Slow Query Profiler & Visualizer** — slow query detection, logging, EXPLAIN PLAN visualization.

All metrics are collected server-side (Go runtime + WAL/connection tracking) and pushed to the
embedded React UI over WebSocket/SSE. No client-side sampling.

---

## 1. Sub-Feature 1: Real-Time Performance Dashboard

### OBS-001: CPU Utilization Sampling
- **Inputs**: host process PID, sampling interval (default `1000ms`, configurable `250ms–5000ms`).
- **Outputs**: `cpu_percent` (REAL, 0.00–100.00), per-core breakdown optional; pushed to `system_metrics_log.cpu_percent`.
- **Control Logic**: Read process CPU times via `runtime.NumCPU()` + OS-specific stat (`/proc/stat` Linux, `GetProcessTimes` Windows). Normalize over the sampling window. Reject values outside `[0,100]` (clamp + warn).
- **Error Messages**:
  - `ERR_CPU_SAMPLE`: "CPU sampling failed: <detail>. Last known value retained."
- **Data Handling**: 2-decimal rounding; timestamp `captured_at` in UTC (RFC3339).

### OBS-002: RAM Utilization Sampling
- **Inputs**: process RSS, heap alloc, total system memory.
- **Outputs**: `ram_used_bytes` (INTEGER), `ram_total_bytes` (INTEGER), derived `ram_percent` (REAL).
- **Control Logic**: Use `runtime.ReadMemStats` for Go heap; `gopsutil`-equivalent syscall for RSS/total. Compute `ram_percent = ram_used_bytes / ram_total_bytes * 100`.
- **Error Messages**:
  - `ERR_MEM_SAMPLE`: "Memory sampling failed: <detail>."
- **Security**: RSS/total bytes never exposed in logs; only percentages + deltas persisted.

### OBS-003: Active Connections Metric
- **Inputs**: live connection registry (HTTP/WS/SSE listeners per `.db` instance).
- **Outputs**: `active_connections` (INTEGER, >= 0), `active_db_id` (TEXT nullable when server-wide).
- **Control Logic**: Maintain atomic counter (`sync/atomic`) incremented on `Accept`, decremented on close. Snapshot value each interval into `system_metrics_log`.
- **Error Messages**:
  - `ERR_CONN_COUNT`: "Connection counter inconsistent (negative). Reset to 0."

### OBS-004: Queries-Per-Second (QPS) Metric
- **Inputs**: monotonic query completion counter.
- **Outputs**: `qps` (REAL, derived = completed_queries / interval_seconds), `queries_total` (INTEGER cumulative).
- **Control Logic**: Tally completed statements per db instance; divide by elapsed interval at snapshot time. Persist both raw cumulative and computed rate.
- **Error Messages**:
  - `ERR_QPS_CALC`: "QPS interval underflow (<1ms). Rate set to 0."

### OBS-005: Real-Time Streaming Transport
- **Inputs**: `system_metrics_log` newest row, client subscription.
- **Outputs**: framed JSON payload `{type:"metric", payload:<row>}` over WebSocket (`/ws/metrics`) or SSE (`/api/metrics/stream`).
- **Control Logic**: Server pushes on each completed interval (backpressure-aware; drop frame if client buffer full > `5s`). Support both WS and SSE; client selects via `Accept` header. Heartbeat ping every `15s`.
- **Error Messages**:
  - `ERR_STREAM_DROP`: "Client backlog exceeded; frame dropped (non-fatal)."
  - `ERR_STREAM_CLOSED`: "Stream closed by client."
- **Security**: Auth required (bearer token / session cookie, same as F4). Unauthenticated subscriptions rejected with `401`.

### OBS-006: Dashboard Rendering & Auto-Refresh
- **Inputs**: streamed metric frames; UI refresh cadence `1000ms`.
- **Outputs**: line charts (CPU%, RAM%), sparkline (QPS), gauge (connections); numeric readouts.
- **Control Logic**: React component buffers last `N=300` points (5-min window at 1s). Pauses rendering when tab hidden (`document.visibilityState`). Reconnects automatically on stream drop with exponential backoff (`1s,2s,4s` cap `30s`).
- **Error Messages**:
  - `ERR_RENDER_STALE`: "Live data stale >10s. Showing last snapshot." (visual warning badge)
- **Data Handling**: All values client-local; no metric written to client storage.

### OBS-007: Threshold Alerting & Visual State
- **Inputs**: configurable thresholds `cpu_warn=85`, `ram_warn=90` (per server config).
- **Outputs**: visual alert state (`OK` | `WARN` | `CRIT`) on dashboard tiles; optional toast.
- **Control Logic**: Evaluate latest snapshot against thresholds. `WARN` at configured level, `CRIT` at `+10%`. State derived server-side and echoed in payload.
- **Error Messages**:
  - `ERR_THRESHOLD_CFG`: "Invalid threshold (>100%). Using default."

---

## 2. Sub-Feature 2: Slow Query Profiler & Visualizer

### OBS-008: Slow Query Detection
- **Inputs**: completed query `duration_ms`, per-db threshold `slow_query_threshold_ms` (default `100ms`).
- **Outputs**: boolean `is_slow`; if true, dispatch to logger (OBS-009).
- **Control Logic**: Measure `time.Since(queryStart)` at statement completion. Compare `>= threshold`. Threshold stored per database in server config; default applied when unset.
- **Error Messages**:
  - `ERR_THRESHOLD_INVALID`: "Threshold must be >0ms. Using 100ms default."

### OBS-009: Slow Query Logging
- **Inputs**: `query_text`, `duration_ms`, `db_id`, `user_id`, `execution_plan` (from OBS-010), `captured_at`.
- **Outputs**: `slow_query_log` row (persisted to WAL-backed store).
- **Control Logic**: On `is_slow`, assemble row and append. Capture `query_fingerprint` (normalized SQL — literals stripped, whitespace collapsed) for aggregation key. Persist raw `query_text` truncated to `8192` chars; full text to `query_full_text` blob if longer.
- **Error Messages**:
  - `ERR_LOG_WRITE`: "Failed to persist slow query log: <detail>. In-memory ring buffer retained."
- **Security**: `user_id` recorded for audit; sensitive literals in `query_text` are NOT redacted by default (operator-visible). Flag `contains_literal` true when literals present.

### OBS-010: EXPLAIN QUERY PLAN Capture
- **Inputs**: original `query_text`, target db handle.
- **Outputs**: `execution_plan` (TEXT, SQLite `EXPLAIN QUERY PLAN` output) stored on `slow_query_log.execution_plan`.
- **Control Logic**: Re-issue `EXPLAIN QUERY PLAN <query>` against the same db snapshot (read-only). Store multi-line plan text verbatim. On parse failure, store `PLAN_UNAVAILABLE`.
- **Error Messages**:
  - `ERR_PLAN_GEN`: "Could not generate plan: <detail>. Stored as PLAN_UNAVAILABLE."
- **Data Handling**: Plan text is immutable post-capture.

### OBS-011: Execution Plan Visualization
- **Inputs**: `slow_query_log.execution_plan` text; `query_text`.
- **Outputs**: parsed tree/table view (scan type, table, rows est, order, detail) rendered in UI.
- **Control Logic**: Parse `EXPLAIN QUERY PLAN` lines (format: `id parent notused detail`). Build nested node tree keyed by `parent` id. Highlight full-table scans (`SCAN`) in red, seeks (`SEARCH`) green. Link each node to `query_text` region.
- **Error Messages**:
  - `ERR_PLAN_PARSE`: "Plan format unrecognized. Showing raw text fallback."
- **Security**: Read-only render; no re-execution of user query.

### OBS-012: Query Performance History Aggregation
- **Inputs**: `slow_query_log` rows grouped by `query_fingerprint`.
- **Outputs**: `query_performance_history` aggregates: `call_count`, `total_duration_ms`, `avg_duration_ms`, `min_duration_ms`, `max_duration_ms`, `p95_duration_ms`, `last_seen_at`, `first_seen_at`.
- **Control Logic**: Incrementally upsert aggregates on each slow-query log write (atomic add). Recompute `p95` over rolling window of last 1000 samples per fingerprint (or full when <1000). Materialized view refreshed on write.
- **Error Messages**:
  - `ERR_AGG_UPDATE`: "Aggregate upsert failed: <detail>. Recompute on read."

### OBS-013: Slow Query Search & Filter
- **Inputs**: `db_id` (optional), `min_duration_ms`, `date_from`, `date_to`, `text_contains`, `sort` (`duration_desc`|`captured_at_desc`), `page`, `limit` (default 50, max 500).
- **Outputs**: filtered `slow_query_log` list with pagination metadata; links to `query_performance_history` for fingerprint-level view.
- **Control Logic**: Parameterized query over indexed columns (`captured_at`, `db_id`, `duration_ms`). Enforce `limit<=500`. Return `total_matches`.
- **Error Messages**:
  - `ERR_QUERY_TIMEOUT`: "Slow-query search timed out after 5000ms."
  - `ERR_INVALID_RANGE`: "date_from must precede date_to."

---

## 3. Cross-Cutting Requirements

### OBS-014: Telemetry Retention & Pruning
- **Inputs**: retention policy `metrics_retention_hours` (default 168), `slow_query_retention_days` (default 30).
- **Outputs**: background pruning job deletes expired `system_metrics_log` / `slow_query_log` rows.
- **Control Logic**: Run every `60min`; `DELETE WHERE captured_at < NOW() - retention`. `query_performance_history` retained indefinitely (aggregates only).
- **Error Messages**:
  - `ERR_PRUNE`: "Pruning job failed: <detail>. Retry next cycle."

### OBS-015: Tenant Isolation & Access Control
- **Inputs**: caller `user_id`, `db_id` scope.
- **Outputs**: metrics/logs filtered to caller-authorized databases only.
- **Control Logic**: Enforce F4 RBAC; server-wide admin sees all db instances, tenant sees own.
- **Security**: `system_metrics_log` server-level rows require admin; per-db rows scoped to ownership.
