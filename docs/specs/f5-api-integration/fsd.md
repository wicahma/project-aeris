# Functional Specification: REST API & Integration (F5)

## 1. Standardized API (API-STD)
Core operational and administrative HTTP endpoints exposed by the Go `net/http` server.

- **API-STD-001: Health Check & Readiness Probe**
  - **Description**: System shall expose lightweight endpoints for uptime and readiness verification.
  - **Inputs**: `GET /api/v1/health`, `GET /api/v1/ready`.
  - **Outputs**: HTTP 200 JSON `{"status": "ok", "version": "v1.0.0", "uptime_seconds": 12040}` or HTTP 503 `{"status": "degraded", "details": "storage engine unavailable"}`.
  - **Logic**: Inspect WAL status, active db file descriptors, and engine lock states before returning.

- **API-STD-002: Authentication & Token Management**
  - **Description**: System shall provide endpoints for session authentication and programmatic API token generation.
  - **Inputs**: `POST /api/v1/auth/login` (body: `username`, `password`), `POST /api/v1/auth/tokens` (body: `name`, `scopes`, `expires_at`, `endpoint_id`).
  - **Outputs**: HTTP 200 JSON with token payload or HTTP 401 Unauthorized.
  - **Logic**: Validate credentials via Argon2id. Generate SHA-256 hashed bearer tokens for programmatic access.

- **API-STD-003: Ad-Hoc Query Execution**
  - **Description**: System shall execute raw SQL or dialect query strings against specified target databases.
  - **Inputs**: `POST /api/v1/query` (body: `database_id`, `sql`, `params`, `read_only`).
  - **Outputs**: HTTP 200 JSON `{"columns": [...], "rows": [...], "execution_time_ms": 1.45}` or HTTP 400/500 with structured error.
  - **Security**: Require `read_write` or `admin` scope for mutating SQL; enforce query timeouts and connection pool bounds.

- **API-STD-004: System Metrics & Introspection**
  - **Description**: System shall export operational metrics including memory usage, storage stats, and active pool handles.
  - **Inputs**: `GET /api/v1/system/metrics`, `GET /api/v1/system/info`.
  - **Outputs**: HTTP 200 JSON containing memory allocations, bbolt page stats, and active connection metrics.

---

## 2. Auto-Generated REST API (API-AUTO)
Dynamic CRUD HTTP endpoints provisioned automatically upon table lifecycle events.

- **API-AUTO-001: Dynamic Route Registration & Lifecycle**
  - **Description**: System shall dynamically register and unregister REST routes when tables are created, altered, or dropped.
  - **Trigger**: DDL execution (`CREATE TABLE`, `DROP TABLE`) or schema catalog synchronization.
  - **Base Path**: `/api/v1/db/:database/tables/:table/records`.

- **API-AUTO-002: Record Creation (POST)**
  - **Description**: Insert single or batch records into target table.
  - **Inputs**: `POST /api/v1/db/:database/tables/:table/records` with JSON body (object or array of objects).
  - **Outputs**: HTTP 201 Created with inserted record ID(s) and full row payload; HTTP 422 Unprocessable Entity on schema validation failure.
  - **Logic**: Enforce NOT NULL, data type affinity, and foreign key constraints before writing to WAL.

- **API-AUTO-003: Record Retrieval & Filtering (GET)**
  - **Description**: Retrieve records with server-side filtering, sorting, column selection, and pagination.
  - **Inputs**: `GET /api/v1/db/:database/tables/:table/records?_limit=50&_offset=0&_sort=-created_at&_fields=id,name&status=eq.active`.
  - **Outputs**: HTTP 200 JSON array with metadata headers (`X-Total-Count`, `X-Page-Size`).
  - **Logic**: Translate URL filter predicates (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `in`) into indexed bbolt lookups.

- **API-AUTO-004: Single Record Lookup by ID (GET)**
  - **Description**: Retrieve single record by primary key identifier.
  - **Inputs**: `GET /api/v1/db/:database/tables/:table/records/:id`.
  - **Outputs**: HTTP 200 JSON record object, or HTTP 404 Not Found `{"error": "RECORD_NOT_FOUND"}`.

- **API-AUTO-005: Record Modification (PUT / PATCH)**
  - **Description**: Replace (PUT) or partially update (PATCH) existing record by primary key.
  - **Inputs**: `PATCH /api/v1/db/:database/tables/:table/records/:id` with JSON delta payload.
  - **Outputs**: HTTP 200 JSON updated record object; HTTP 404 if not found; HTTP 409 on version/unique conflict.

- **API-AUTO-006: Record Deletion (DELETE)**
  - **Description**: Remove single record by ID or bulk purge via filter predicates.
  - **Inputs**: `DELETE /api/v1/db/:database/tables/:table/records/:id`.
  - **Outputs**: HTTP 204 No Content on success; HTTP 404 if record does not exist.

- **API-AUTO-007: Per-Endpoint Authentication & Scopes**
  - **Description**: Enforce granular token permissions per table route.
  - **Inputs**: `Authorization: Bearer <token>` HTTP header.
  - **Logic**: Verify token validity against `api_tokens` table. Enforce read/write/delete scope restrictions per endpoint.

- **API-AUTO-008: Dynamic Schema Introspection (GET)**
  - **Description**: Expose OpenAPI/JSON-Schema definition for auto-generated endpoints.
  - **Inputs**: `GET /api/v1/db/:database/tables/:table/schema`.
  - **Outputs**: HTTP 200 JSON Schema detailing fields, data types, required constraints, and endpoints.

---

## 3. Webhooks & Event Triggers (API-HOOK)
Asynchronous HTTP notification system triggered by database mutations.

- **API-HOOK-001: Webhook Registration & Management**
  - **Description**: Create, update, list, and delete webhook subscriptions.
  - **Inputs**: `POST /api/v1/webhooks` with payload `database_id`, `table_id`, `target_url`, `events` (`["INSERT", "UPDATE", "DELETE"]`), `secret_token`.
  - **Outputs**: HTTP 201 Created with webhook configuration ID and verification status.

- **API-HOOK-002: Change Data Capture (CDC) Event Dispatch**
  - **Description**: Asynchronously dispatch HTTP POST requests to configured URLs upon WAL commit of data changes.
  - **Payload Structure**:
    ```json
    {
      "event_id": "evt_01J8G...",
      "event_type": "INSERT",
      "database": "production",
      "table": "users",
      "timestamp": "2026-08-30T10:00:00Z",
      "data": {"id": 101, "name": "Alice"},
      "old_data": null
    }
    ```
  - **Logic**: Non-blocking worker pool consuming internal event bus.

- **API-HOOK-003: Payload Cryptographic Signing**
  - **Description**: Secure webhook delivery using HMAC SHA-256 signatures.
  - **Headers Sent**: `X-Aeris-Signature: sha256=<hex_hmac>`, `X-Aeris-Event-ID: <id>`, `X-Aeris-Delivery-Attempt: <attempt>`.
  - **Logic**: Compute HMAC over raw HTTP request body using configured secret.

- **API-HOOK-004: Delivery Retry & Exponential Backoff**
  - **Description**: Automatic retry on transient HTTP delivery failures (5xx or network timeout).
  - **Policy**: Configurable max attempts (default 5). Backoff schedule: 2s, 10s, 60s, 300s, 1800s.
  - **Dead Letter Handling**: Mark delivery as failed after max attempts; emit alert metric.

- **API-HOOK-005: Webhook Execution Logging & Audit History**
  - **Description**: Record full history of dispatched webhooks, responses, latencies, and errors.
  - **Query Inputs**: `GET /api/v1/webhooks/:id/logs?_limit=20`.
  - **Outputs**: HTTP 200 JSON list containing request timestamps, response status codes, latency in ms, and error messages.

- **API-HOOK-006: Webhook Circuit Breaking & Health Controls**
  - **Description**: Automatically disable webhooks with continuous 100% failure rates to preserve system resources.
  - **Threshold**: 20 consecutive delivery failures flips webhook status to `DEGRADED`/`PAUSED`.
  - **Outputs**: Notification to dashboard and `PATCH /api/v1/webhooks/:id` to reactivate.
