# Entity Relationship Diagram (ERD): REST API & Integration (F5)

## 1. Visual Schema Diagram

```mermaid
erDiagram
    API_ENDPOINTS ||--o{ API_TOKENS : "authorized_via"
    TABLES_METADATA ||--o{ API_ENDPOINTS : "mapped_to"
    WEBHOOK_CONFIGS ||--o{ WEBHOOK_PAYLOADS_LOG : "generates"
    TABLES_METADATA ||--o{ WEBHOOK_CONFIGS : "monitored_by"
    
    API_ENDPOINTS {
        string id PK "UUID"
        string database_id FK "References tables_metadata.database_id"
        string table_id FK "References tables_metadata.id (NULL for static)"
        string route_path "Canonical URL pattern (e.g. /api/v1/db/...) "
        string method "GET | POST | PUT | PATCH | DELETE"
        string handler_type "STATIC | AUTO_CRUD | QUERY"
        boolean is_active "Route operational status"
        datetime created_at "ISO-8601"
    }

    API_TOKENS {
        string id PK "UUID"
        string endpoint_id FK "References api_endpoints.id (NULL for global)"
        string user_id FK "References users.id"
        string name "Descriptive label"
        string token_hash "SHA-256 of bearer token"
        string scopes "Space separated (read, write, delete, query)"
        datetime expires_at "ISO-8601 (NULL for persistent)"
        datetime last_used_at "ISO-8601"
        string last_ip "IPv4/v6 address"
    }

    WEBHOOK_CONFIGS {
        string id PK "UUID"
        string table_id FK "References tables_metadata.id"
        string target_url "Fully qualified destination URL"
        string events "JSON array ['INSERT', 'UPDATE', 'DELETE']"
        string secret_token "Used for HMAC signing"
        string status "ACTIVE | DEGRADED | PAUSED"
        integer failure_count "Consecutive delivery failures"
        datetime created_at "ISO-8601"
        datetime updated_at "ISO-8601"
    }

    WEBHOOK_PAYLOADS_LOG {
        string id PK "UUID"
        string webhook_config_id FK "References webhook_configs.id"
        string event_id "External-facing event identifier"
        string event_type "INSERT | UPDATE | DELETE"
        integer attempt_number "1-indexed retry counter"
        integer http_status "Remote response status (e.g. 200, 502)"
        string response_body "Truncated remote response content"
        integer latency_ms "Total roundtrip time"
        string error_message "Local delivery error summary"
        datetime dispatched_at "ISO-8601"
    }
```

---

## 2. Entity Definitions & Production Attributes

### Entity: `api_endpoints`
Dynamic registry of all exposed HTTP routes.
- `id`: TEXT (UUID), PRIMARY KEY.
- `database_id`: TEXT (UUID), NOT NULL. Logical association for db-specific routes.
- `table_id`: TEXT (UUID), NULLABLE. Links to `tables_metadata(id)` for auto-generated CRUD.
- `route_path`: TEXT, NOT NULL. The exact URI suffix (e.g., `/v1/db/prod/tables/users/records`).
- `method`: TEXT, NOT NULL. Restricted to `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- `handler_type`: TEXT, NOT NULL. Enum: `STATIC`, `AUTO_CRUD`, `QUERY`.
- `is_active`: BOOLEAN, NOT NULL, DEFAULT TRUE.
- `created_at`: DATETIME, NOT NULL.
- *Indexes*: `idx_endpoints_route_method` UNIQUE ON (`route_path`, `method`).

### Entity: `api_tokens`
Programmatic access credentials.
- `id`: TEXT (UUID), PRIMARY KEY.
- `endpoint_id`: TEXT (UUID), NULLABLE. Links to `api_endpoints(id)`. If NULL, token is global per user.
- `user_id`: TEXT (UUID), NOT NULL. The owner of the token.
- `name`: TEXT, NOT NULL. User-defined label (e.g., "Grafana-Read-Only").
- `token_hash`: TEXT, NOT NULL. SHA-256 hash of the bearer token provided to client.
- `scopes`: TEXT, NOT NULL. Comma-separated or JSON list of permission flags.
- `expires_at`: DATETIME, NULLABLE. Token becomes invalid after this point.
- `last_used_at`: DATETIME, NULLABLE. Tracked on every successful auth.
- `last_ip`: TEXT, NULLABLE. IP of the last successful request.
- *Indexes*: `idx_tokens_hash` UNIQUE ON (`token_hash`).

### Entity: `webhook_configs`
Subscription registry for external event notifications.
- `id`: TEXT (UUID), PRIMARY KEY.
- `table_id`: TEXT (UUID), NOT NULL. FOREIGN KEY to `tables_metadata(id)`.
- `target_url`: TEXT, NOT NULL. Must pass URL validation (protocol + host).
- `events`: TEXT (JSON), NOT NULL. Array of supported event types (INSERT, UPDATE, DELETE).
- `secret_token`: TEXT, NOT NULL. Used as HMAC key for payload signing.
- `status`: TEXT, NOT NULL. DEFAULT 'ACTIVE'. Enum: 'ACTIVE', 'DEGRADED', 'PAUSED'.
- `failure_count`: INTEGER, NOT NULL, DEFAULT 0. Increments on errors; resets on success.
- `created_at`: DATETIME, NOT NULL.
- `updated_at`: DATETIME, NOT NULL.
- *Indexes*: `idx_webhooks_table` ON (`table_id`).

### Entity: `webhook_payloads_log`
Historical audit trail of delivery attempts.
- `id`: TEXT (UUID), PRIMARY KEY.
- `webhook_config_id`: TEXT (UUID), NOT NULL. FOREIGN KEY to `webhook_configs(id)` ON DELETE CASCADE.
- `event_id`: TEXT, NOT NULL. UUID or ULID used in the payload and headers.
- `event_type`: TEXT, NOT NULL. One of the triggered events.
- `attempt_number`: INTEGER, NOT NULL, DEFAULT 1.
- `http_status`: INTEGER, NULLABLE. Result from the target URL.
- `response_body`: TEXT, NULLABLE. Snippet of the response (e.g., first 1KB).
- `latency_ms`: INTEGER, NULLABLE.
- `error_message`: TEXT, NULLABLE. Internal error (e.g., "timeout", "DNS failed").
- `dispatched_at`: DATETIME, NOT NULL.
- *Indexes*: `idx_logs_webhook_id` ON (`webhook_config_id`), `idx_logs_event` ON (`event_id`).
- *Constraints*: CHECK `attempt_number` > 0.
