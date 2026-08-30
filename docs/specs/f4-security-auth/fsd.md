# Functional Specification — Security & Authentication (F4)

**Feature:** F4 Security & Authentication · **Module:** `auth`
**Scope:** Web DBMS dashboard access control for Project Aeris (Go single-binary DBMS, React+TS frontend embedded via `go:embed`, bbolt storage with WAL, per-database `.db` files).

**Conventions**
- Requirement codes: `SEC-RBAC-###` (RBAC), `SEC-AUTH-###` (Authentication), `SEC-SES-###` (Session/Token).
- All timestamps: UTC, RFC3339, stored as Unix nanos in bbolt.
- Passwords: Argon2id (memory=64 MiB, iterations=3, parallelism=4, salt=16 B). BCrypt (cost=12) permitted as fallback for migrated accounts.
- Tokens: 32-byte random → hex (64 chars). Stored as `SHA-256(raw_token)` only; raw token issued once, never persisted.
- Errors returned to client are generic to avoid user enumeration.

---

## 1. Role-Based Access Control (RBAC)

### SEC-RBAC-001 — Create user
- **Input:** `POST /api/v1/users` { username:string[3..64], password:string[12..128], status:enum[active,disabled], role_ids:uuid[] }
- **Logic:** Validate uniqueness of `username` (case-insensitive). Hash password with Argon2id. Create `users` row + `user_roles` rows. Default `status=active` if omitted.
- **Success:** `201` { id, username, status, role_ids }
- **Error:** `409` "username exists" · `400` "username/password policy violation" · `401` if caller lacks `users:write`.
- **Security:** Password never returned. Creator must hold `users:write`.

### SEC-RBAC-002 — Store password hash
- **Logic:** On create/change, compute `password_hash = argon2id(password, salt)`. Store algorithm+params+salt+hash in single `password_hash` field (PHC string format `$argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>`).
- **Constraint:** Plaintext password is zeroed from memory after hashing; never logged, never stored.
- **Error:** `500` "hash failure" (aborts create, no partial row).

### SEC-RBAC-003 — Assign roles to user
- **Input:** `PUT /api/v1/users/{id}/roles` { role_ids:uuid[] }
- **Logic:** Replace `user_roles` set (delete existing, insert new). At least one role required unless user is being disabled.
- **Success:** `200` { id, role_ids }
- **Error:** `404` user · `400` "at least one role" · `401` lacks `users:write`.

### SEC-RBAC-004 — Define permission model
- **Logic:** Permissions are `scope:action` strings (e.g. `db:read`, `db:write`, `users:write`, `sys:admin`). Roles aggregate permissions via `role_permissions`. Effective permission = union over assigned roles. **Default deny** — any action not explicitly granted is rejected.
- **Security:** No implicit admin; `sys:admin` is the only role granting `users:write` and `sys:*`.

### SEC-RBAC-005 — Enforce read-only (User A)
- **Input:** Any mutating op (write/delete/create) by a user whose effective permissions contain `db:read` but NOT `db:write`.
- **Logic:** At API boundary, check `db:write` ∈ effective_permissions(user).
- **Error:** `403` "insufficient permission" (generic). No data mutated.
- **Success path for read:** `db:read` allows `GET /api/v1/query`, `GET /api/v1/db/*`.

### SEC-RBAC-006 — Enforce write (User B)
- **Logic:** User with `db:write` also implicitly holds `db:read` (write role includes read). Mutations allowed on `db:write` scope.
- **Success:** `2xx` on write ops.
- **Error:** `403` if scope outside granted set.

### SEC-RBAC-007 — Evaluate effective permissions
- **Input:** Each authenticated request carries `user_id`.
- **Logic:** `effective = SELECT DISTINCT p.* FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id JOIN user_roles ur ON ur.role_id=rp.role_id WHERE ur.user_id=$user`. Cached per session (TTL = session lifetime).
- **Success:** permission set available to authz middleware.
- **Error:** empty set → default deny.

### SEC-RBAC-008 — User status gating
- **Logic:** `disabled` or `locked` users are rejected at auth (`SEC-AUTH-002`). `active` required to issue token.
- **Error:** `401` generic "invalid credentials" for disabled/locked.

### SEC-RBAC-009 — Change / reset password
- **Input:** `PUT /api/v1/users/{id}/password` { current_password? , new_password }
- **Logic:** Self-change requires `current_password` verified. Admin reset omits it but requires `users:write`. Re-hash new password (Argon2id). On success, force re-auth: revoke all existing sessions (`SEC-SES-005`).
- **Success:** `200` + all sessions revoked.
- **Error:** `401` wrong current · `400` weak new password · `403` lacks right.

### SEC-RBAC-010 — List / filter users
- **Input:** `GET /api/v1/users?status=&role_id=&q=` (pagination `limit`,`offset`)
- **Logic:** Returns users with their role_ids. `password_hash` excluded.
- **Success:** `200` { items:[{id,username,status,role_ids,created_at}], total }
- **Error:** `401` lacks `users:write` (listing is admin-scoped).

---

## 2. Authentication

### SEC-AUTH-001 — Login screen
- **Input:** `GET /login` renders embedded React form (username, password, submit). Unauthenticated access to `/` or `/api/*` returns `401` → client redirects to `/login`.
- **Logic:** Form posts to `POST /api/v1/auth/login`. No creds in URL/query.
- **Success:** form loads.
- **Error:** none (public route).

### SEC-AUTH-002 — Verify credentials
- **Input:** `POST /api/v1/auth/login` { username, password } from `ip_address`, `user_agent`.
- **Logic:** Look up `users` by username. If found & active, `argon2id.Verify(password_hash, password)`. On fail OR missing user, record `login_attempts` (success=false) and return generic error.
- **Success:** `200` { token, expires_at } + sets `HttpOnly; Secure; SameSite=Strict; Path=/api` cookie. Creates session (`SEC-SES-001`).
- **Error:** `401` "invalid credentials" (same message whether username missing or wrong password — no enumeration).
- **Security:** constant-time compare; generic message; attempts logged with IP.

### SEC-AUTH-003 — Issue session on success
- **Logic:** On verified credential, create `_system_sessions` + `session_tokens` rows; emit raw token to client once (`SEC-SES-001`).
- **Success:** token returned.
- **Error:** `500` "session creation failed" (no token, no login).

### SEC-AUTH-004 — Account lockout (brute-force)
- **Logic:** Count `login_attempts` with `success=false` for `(username OR ip_address)` within last 15 min. If ≥ 5, set `users.status=locked` and `locked_until = now+15m`. Locked users rejected until expiry.
- **Success:** n/a.
- **Error:** `401` generic; `429` "too many attempts" when IP-wide rate exceeded.
- **Security:** lock keyed on both username and IP to blunt distributed guessing.

### SEC-AUTH-005 — Record login attempts
- **Logic:** Every login request (success or fail) inserts `login_attempts` { username, ip_address, user_agent, success, attempted_at }. Used by `SEC-AUTH-004` and auditing.
- **Success/Error:** row written regardless of outcome.
- **Retention:** purged > 90 days (background job).

### SEC-AUTH-006 — IP rate limiting
- **Logic:** Max 10 login attempts / IP / 60 s. Exceeding returns `429` without invoking credential check. Counter in `login_attempts` + in-memory sliding window.
- **Error:** `429` "rate limited".

### SEC-AUTH-007 — Generic error messaging
- **Logic:** All auth failures return identical `401` "invalid credentials". Username-existence, lockout, and wrong-password are indistinguishable to the caller.
- **Security:** prevents user enumeration.

### SEC-AUTH-008 — Secure session cookie
- **Logic:** Token delivered as cookie: `HttpOnly`, `Secure` (TLS only), `SameSite=Strict`, `Path=/api`, `Max-Age=expires_at`. Frontend reads only via authenticated API; JS cannot access.
- **Security:** mitigates XSS token theft.

### SEC-AUTH-009 — Logout (current device)
- **Input:** `POST /api/v1/auth/logout`
- **Logic:** Resolve `user_id`+`session_id` from token, set `session_tokens.revoked_at=now` and `_system_sessions.revoked_at=now`. Raw token invalid immediately.
- **Success:** `204`.
- **Error:** `401` if already invalid.

### SEC-AUTH-010 — Guard dashboard
- **Logic:** Every `/api/*` (except `/api/v1/auth/login`, `/api/v1/health`) requires valid, unrevoked, unexpired token (`SEC-SES-002`). Missing/invalid → `401` + client redirect `/login`.
- **Error:** `401` "unauthenticated".

---

## 3. Stateful Token & Session Management

### SEC-SES-001 — Issue token + session
- **Input:** post-auth `user_id`, `ip_address`, `user_agent`.
- **Logic:** Generate `raw_token` = 32 random bytes (CSPRNG) → hex. `token_hash = SHA-256(raw_token)` (hex). Insert `_system_sessions` { id, user_id, ip_address, user_agent, created_at, expires_at, last_seen_at }. Insert `session_tokens` { id, session_id, token_hash, issued_at, expires_at, revoked_at=NULL }. `raw_token` returned to client once; never stored.
- **Success:** `200` { token:raw, expires_at }.
- **Error:** `500` if insert fails (no partial session).

### SEC-SES-002 — Validate token per request
- **Logic:** `h = SHA-256(received_token)`. `SELECT st.*, s.* FROM session_tokens st JOIN _system_sessions s ON s.id=st.session_id WHERE st.token_hash=h`. Valid iff row exists AND `st.revoked_at IS NULL` AND `s.revoked_at IS NULL` AND `st.expires_at > now`. On valid, update `s.last_seen_at=now`.
- **Success:** `user_id` attached to request context.
- **Error:** `401` if missing/expired/revoked.

### SEC-SES-003 — Track IP & User-Agent
- **Logic:** `ip_address` and `user_agent` captured at session creation (`_system_sessions`). On each request, if `ip_address` or `user_agent` changes vs session, append to `session_activity` (optional) and optionally flag/surface in session list. Core: stored at creation; anomaly visible in `SEC-SES-007`.
- **Security:** enables detection of token reuse from new device/network.

### SEC-SES-004 — Instant revocation
- **Logic:** Revocation = `UPDATE session_tokens SET revoked_at=now WHERE id=?` (and/or session-level). Because validation checks `revoked_at IS NULL` on every request, revocation takes effect on the **next** request — no grace period, no waiting on TTL.
- **Success:** `204` revoke.
- **Security:** satisfies "instant revocation" requirement.

### SEC-SES-005 — Logout All Devices
- **Input:** `POST /api/v1/auth/logout-all` (self) or `POST /api/v1/users/{id}/sessions/revoke-all` (admin).
- **Logic:** `UPDATE session_tokens SET revoked_at=now WHERE session_id IN (SELECT id FROM _system_sessions WHERE user_id=$uid)`; also set `_system_sessions.revoked_at`. All tokens for user invalid immediately.
- **Success:** `204` { revoked_count }.
- **Error:** `401`/`403` per scope.

### SEC-SES-006 — Expiry & cleanup
- **Logic:** `expires_at = created_at + TTL` (default 7 days, configurable). Validation rejects expired. Background job (`SEC-SES-cleanup`) deletes `session_tokens` and `_system_sessions` where `expires_at < now` or `revoked_at < now - 24h`. WAL-compacted.
- **Success:** storage reclaimed.

### SEC-SES-007 — List active sessions
- **Input:** `GET /api/v1/users/{id}/sessions` (admin) or `/api/v1/me/sessions` (self).
- **Logic:** Return sessions with `ip_address`, `user_agent`, `created_at`, `last_seen_at`, `expires_at`, `current` flag (matches caller token). Reveals only metadata, never tokens.
- **Success:** `200` { items:[...] }.
- **Error:** `403` cross-user without `users:write`.

### SEC-SES-008 — Concurrent session limit
- **Logic:** Configurable `max_sessions_per_user` (default 10). On new session creation, if active (unrevoked, unexpired) count ≥ limit, revoke oldest `last_seen_at` session.
- **Success:** newest session active.
- **Security:** bounds token-table growth.

### SEC-SES-009 — Password-change cascade
- **Logic:** On `SEC-RBAC-009` success, invoke `SEC-SES-005` (revoke all) so stolen tokens die with the old password.
- **Success:** all sessions invalidated.

---

## Cross-cutting security rules
- **TLS only:** all `/api/*` served over HTTPS; `Secure` cookie enforced.
- **No secrets in logs:** `password`, `raw_token`, `password_hash` excluded from all logs/telemetry.
- **Default deny** everywhere (`SEC-RBAC-004`, `SEC-SES-002`).
- **bbolt storage:** each entity = a bucket; row key = `id` (UUID v4); value = JSON. `_system_sessions` and `session_tokens` live in the **system** database (not user-created DBs) so auth survives per-DB isolation. Indexes (username, token_hash, user_id) implemented as secondary buckets (`idx_<col>` → id).
