# Entity-Relationship Diagram: UI/UX (F8)

## Entities

### 1. `command_palette_search_index`
In-memory search index for the Command Palette. Populated at startup and updated on schema changes.

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Internal row ID. |
| `entity_type` | `TEXT` | `NOT NULL` | One of: `database`, `table`, `menu`. |
| `entity_name` | `TEXT` | `NOT NULL` | Display name (e.g., `users`, `analytics_db`). |
| `parent_name` | `TEXT` | `NULL` | Parent scope (e.g., database name for a table). |
| `route_path` | `TEXT` | `NOT NULL` | Frontend route to navigate to. |
| `search_text` | `TEXT` | `NOT NULL` | Normalized lowercase text for fuzzy matching. |
| `updated_at` | `INTEGER` | `NOT NULL` | Unix epoch ms; bumped on re-index. |

**Indexes:**
- `UNIQUE(entity_type, entity_name, parent_name)` — prevents duplicate entries.
- `INDEX(search_text)` — accelerates fuzzy lookups.

---

### 2. `shared_views`
Persisted share tokens for read-only data sharing.

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Internal row ID. |
| `token` | `TEXT` | `UNIQUE NOT NULL` | 32-byte URL-safe random string (base64). |
| `resource_type` | `TEXT` | `NOT NULL` | One of: `table`, `query`. |
| `database_name` | `TEXT` | `NOT NULL` | Target database. |
| `table_name` | `TEXT` | `NULL` | Target table (when `resource_type = 'table'`). |
| `query_sql` | `TEXT` | `NULL` | Raw SQL (when `resource_type = 'query'`). |
| `created_by` | `TEXT` | `NOT NULL` | User/actor who created the share. |
| `created_at` | `INTEGER` | `NOT NULL` | Unix epoch ms. |
| `expires_at` | `INTEGER` | `NULL` | Unix epoch ms; `NULL` = no expiry. |
| `is_revoked` | `INTEGER` | `NOT NULL DEFAULT 0` | Boolean flag; `1` = access denied. |
| `access_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Audit counter for public hits. |

**Indexes:**
- `UNIQUE(token)` — primary lookup key for public access.
- `INDEX(expires_at)` — speeds up TTL sweep queries.
- `INDEX(created_by)` — filters shares by owner.

**Constraints:**
- `CHECK(resource_type IN ('table', 'query'))`
- `CHECK(resource_type = 'table' AND table_name IS NOT NULL OR resource_type = 'query' AND query_sql IS NOT NULL)` — mutual exclusivity.

---

## Relationships

| Parent | Child | Cardinality | Description |
|:---|:---|:---|:---|
| `databases` (system) | `shared_views` | 1:N | A database can have many shared views. |
| `tables` (system) | `shared_views` | 1:N | A table can be referenced by many shared views. |
| `command_palette_search_index` | — | — | Standalone index; no FK relationships. |

**Notes:**
- `shared_views.database_name` and `shared_views.table_name` reference logical schema names, not physical bbolt keys. No hard FK constraint — schema can be dropped while shares remain (orphaned shares are filtered at query time).
- `command_palette_search_index` is rebuilt from the live schema on startup; it is not persisted to bbolt.