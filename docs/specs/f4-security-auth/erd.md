# Entity-Relationship Diagram — Security & Authentication (F4)

**Storage note:** Project Aeris uses bbolt with WAL. "Tables" below are bbolt buckets in the **system** `.db`. Columns = JSON keys in each value. PKs/IDs = UUID v4. Indexes = secondary buckets (`idx_<field> → id`).

---

## ERD Overview

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users      │1────N│  user_roles   │N────1│    roles      │
│              │       │              │       │              │
└──────┬───────┘       └──────────────┘       └──────┬───────┘
       │ 1                                        1 │
       │                                            │
       │ N                                   N ┌──────────────┐
       │                                ┌────│role_permissions│
       │                                │    └───────┬───────┘
       │                                │            │ M
       │                                │            │
       │                                │      ┌─────┴────────┐
       │                                │      │ permissions   │
       │                                │      └──────────────┘
       │
       │ 1
┌──────┴───────┐       ┌──────────────┐
│ _system_     │1────N│session_tokens │
│   sessions   │      │              │
└──────────────┘      └──────────────┘

┌──────────────┐
│login_attempts│  (standalone, FK-free)
└──────────────┘
```

---

## Entity Definitions

### 1. `users`

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `id` | UUID (string) | PK | v4 random |
| `username` | string(3..64) | UNIQUE, NOT NULL, case-insensitive | `[idx_username]` |
| `password_hash` | string(128) | NOT NULL | PHC: `$argon2id$v=19$m=65536,t=3,p=4$<salt16>$<hash32>`. Never returned to client. |
| `status` | enum: active,disabled,locked | NOT NULL, default `active` | |
| `locked_until` | unix_nanos (int64) | NULL | Set when `status=locked` by brute-force lockout. NULL = not locked. |
| `created_at` | unix_nanos (int64) | NOT NULL | |
| `updated_at` | unix_nanos (int64) | NOT NULL | |

**Indexes:** `idx_username` → `id`

---

### 2. `roles`

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `name` | string(3..32) | UNIQUE, NOT NULL | e.g. `admin`, `read_write`, `read_only` |
| `description` | string(256) | NOT NULL | Human-readable |
| `is_system` | bool | NOT NULL, default `false` | `true` for seeded roles (prevent delete) |
| `created_at` | unix_nanos | NOT NULL | |
| `updated_at` | unix_nanos | NOT NULL | |

**Seeded roles:**

| name | permissions | is_system |
|---|---|---|
| `admin` | `sys:*`, `db:read`, `db:write`, `users:read`, `users:write` | true |
| `read_write` | `db:read`, `db:write` | true |
| `read_only` | `db:read` | true |

---

### 3. `permissions`

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `scope` | string(32) | NOT NULL | e.g. `db`, `users`, `sys` |
| `action` | string(32) | NOT NULL | e.g. `read`, `write`, `admin` |
| `description` | string(128) | NOT NULL | |

**Constraint:** UNIQUE(`scope`, `action`)

**Seeded permissions:**

| scope | action | description |
|---|---|---|
| `db` | `read` | Query / list databases |
| `db` | `write` | Create, alter, delete data |
| `users` | `read` | List users (admin panel) |
| `users` | `write` | Create, disable, reset users |
| `sys` | `admin` | System config, server restart |

---

### 4. `user_roles` (junction)

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `user_id` | UUID | FK → `users.id`, NOT NULL | Composite PK with `role_id` |
| `role_id` | UUID | FK → `roles.id`, NOT NULL | Composite PK with `user_id` |
| `assigned_at` | unix_nanos | NOT NULL | |

**PK:** (`user_id`, `role_id`)
**Indexes:** `idx_user_roles_role_id` → `role_id` (for role→user lookups)

**Cardinality:** M:N — user has many roles, role assigned to many users.
**Constraint:** user must have ≥ 1 role while `status = active` (enforced at application layer).

---

### 5. `role_permissions` (junction)

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `role_id` | UUID | FK → `roles.id`, NOT NULL | Composite PK with `permission_id` |
| `permission_id` | UUID | FK → `permissions.id`, NOT NULL | Composite PK with `role_id` |
| `assigned_at` | unix_nanos | NOT NULL | |

**PK:** (`role_id`, `permission_id`)

**Cardinality:** M:N — role has many permissions, permission granted via many roles.

---

### 6. `_system_sessions`

Stored in the **system** database bucket (not user DBs). Bucket name = `_system_sessions`.

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `user_id` | UUID | FK → `users.id`, NOT NULL | `[idx_sessions_user_id]` |
| `ip_address` | string(45) | NOT NULL | max for IPv6-mapped IPv4 |
| `user_agent` | string(512) | NOT NULL | Raw UA string |
| `created_at` | unix_nanos | NOT NULL | |
| `expires_at` | unix_nanos | NOT NULL | `created_at + TTL` (default 7d) |
| `last_seen_at` | unix_nanos | NOT NULL | Updated on each authenticated request |
| `revoked_at` | unix_nanos | NULL | NULL = active; non-NULL = revoked. Check on every validation. |

**Indexes:**
- `idx_sessions_user_id` → `id`
- `idx_sessions_user_active` → `id` (where `revoked_at IS NULL AND expires_at > now`)

**Cardinality:** 1:N — one user has many sessions.
**Lifecycle:** row created at login, deleted at logout / expiry / cleanup job.

---

### 7. `session_tokens`

Stores the **hashed** token. Raw token issued once to client, never persisted.

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `session_id` | UUID | FK → `_system_sessions.id`, NOT NULL | `[idx_tokens_session_id]` |
| `token_hash` | string(64) | UNIQUE, NOT NULL | `SHA-256(raw_token)` as hex. `[idx_tokens_hash]` |
| `issued_at` | unix_nanos | NOT NULL | |
| `expires_at` | unix_nanos | NOT NULL | Mirror of session `expires_at` |
| `revoked_at` | unix_nanos | NULL | NULL = valid; non-NULL = revoked (instant revocation) |

**Indexes:**
- `idx_tokens_hash` → `id` (primary lookup — every request)
- `idx_tokens_session_id` → `id` (for cascade revocation by session)

**Cardinality:** 1:N — one session has many tokens (if re-issued without revoking old). But typical: 1:1.
**Validation query (per request):**

```
h = SHA-256(received_token)
SELECT t.*, s.user_id, s.revoked_at AS session_revoked
FROM session_tokens t
JOIN _system_sessions s ON s.id = t.session_id
WHERE t.token_hash = h
```

Valid iff: row exists AND `t.revoked_at IS NULL` AND `s.revoked_at IS NULL` AND `t.expires_at > now()`.

---

### 8. `login_attempts`

Standalone table (no FK). Retained for brute-force detection + audit. Purged after 90 days.

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `username` | string(64) | NOT NULL | Raw input (may not match existing user) |
| `ip_address` | string(45) | NOT NULL | `[idx_attempts_ip]` |
| `user_agent` | string(512) | NULL | |
| `success` | bool | NOT NULL | |
| `attempted_at` | unix_nanos | NOT NULL | `[idx_attempts_time]` |

**Indexes:**
- `idx_attempts_ip` → `attempted_at` (rate limiting: count by IP + time)
- `idx_attempts_username` → `attempted_at` (lockout check)
- `idx_attempts_time` → `id` (cleanup: WHERE `attempted_at < now() - 90d`)

---

## Relationship Summary

| Relationship | From → To | Cardinality | Join Field |
|---|---|---|---|
| User has many roles | `users` → `user_roles` | 1:N | `user_id` |
| Role assigned to many users | `roles` → `user_roles` | 1:N | `role_id` |
| Role has many permissions | `roles` → `role_permissions` | 1:N | `role_id` |
| Permission granted via many roles | `permissions` → `role_permissions` | 1:N | `permission_id` |
| User has many sessions | `users` → `_system_sessions` | 1:N | `user_id` |
| Session has many tokens | `_system_sessions` → `session_tokens` | 1:N | `session_id` |

---

## Security Field Summary

| Field | Table | Purpose |
|---|---|---|
| `password_hash` | `users` | Argon2id (PHC format); bcrypt fallback for migration |
| `token_hash` | `session_tokens` | SHA-256 of raw token (hex); raw never stored |
| `ip_address` | `_system_sessions`, `login_attempts` | Origin tracking + brute-force key |
| `user_agent` | `_system_sessions`, `login_attempts` | Device fingerprint |
| `expires_at` | `_system_sessions`, `session_tokens` | Absolute TTL enforcement |
| `revoked_at` | `_system_sessions`, `session_tokens` | Instant revocation (NULL=valid) |
| `locked_until` | `users` | Brute-force lockout expiry |
| `status` | `users` | `active` / `disabled` / `locked` — auth gate |
