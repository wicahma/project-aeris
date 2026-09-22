package engine

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

// ponytail: API key auth only. No session cookie, no RBAC, no user management
// UI. Single-user localhost = no auth required. Multi-user = API key via
// Authorization header. Upgrade path: full session management (SM-001) +
// RBAC when multi-user with roles needed.

type APIKey struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	KeyHash   string `json:"-"` // never expose
	CreatedAt string `json:"createdAt"`
	ExpiresAt string `json:"expiresAt,omitempty"`
}

func (d *Database) CreateAPIKey(name string, expiresInDays int) (*APIKey, string, error) {
	if name == "" {
		return nil, "", fmt.Errorf("ERR_INVALID_INPUT: name required")
	}

	// Generate random key
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return nil, "", err
	}
	key := "aeris_" + hex.EncodeToString(raw)
	hash := sha256.Sum256([]byte(key))

	expires := ""
	if expiresInDays > 0 {
		expires = time.Now().AddDate(0, 0, expiresInDays).UTC().Format(time.RFC3339)
	}

	res, err := d.db.Exec(
		`INSERT INTO _system_api_keys (name, key_hash, created_at, expires_at) VALUES (?,?,?,?)`,
		name, hex.EncodeToString(hash[:]), time.Now().UTC().Format(time.RFC3339), expires,
	)
	if err != nil {
		return nil, "", err
	}
	id, _ := res.LastInsertId()

	return &APIKey{
		ID:        id,
		Name:      name,
		KeyHash:   hex.EncodeToString(hash[:]),
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		ExpiresAt: expires,
	}, key, nil
}

func (d *Database) ValidateAPIKey(key string) (*APIKey, error) {
	if len(key) < 8 || key[:6] != "aeris_" {
		return nil, fmt.Errorf("ERR_INVALID_KEY_FORMAT")
	}
	hash := sha256.Sum256([]byte(key))
	hashHex := hex.EncodeToString(hash[:])

	var k APIKey
	var expiresAt *string
	row := d.db.QueryRow(
		`SELECT id, name, key_hash, created_at, expires_at FROM _system_api_keys WHERE key_hash = ?`,
		hashHex,
	)
	err := row.Scan(&k.ID, &k.Name, &k.KeyHash, &k.CreatedAt, &expiresAt)
	if err != nil {
		return nil, fmt.Errorf("ERR_KEY_NOT_FOUND")
	}
	if expiresAt != nil && *expiresAt != "" {
		exp, err := time.Parse(time.RFC3339, *expiresAt)
		if err == nil && time.Now().After(exp) {
			return nil, fmt.Errorf("ERR_KEY_EXPIRED")
		}
		k.ExpiresAt = *expiresAt
	}
	return &k, nil
}

func (d *Database) ListAPIKeys() ([]APIKey, error) {
	rows, err := d.db.Query(`SELECT id, name, key_hash, created_at, expires_at FROM _system_api_keys ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []APIKey
	for rows.Next() {
		var k APIKey
		var expiresAt *string
		if err := rows.Scan(&k.ID, &k.Name, &k.KeyHash, &k.CreatedAt, &expiresAt); err != nil {
			return nil, err
		}
		if expiresAt != nil {
			k.ExpiresAt = *expiresAt
		}
		out = append(out, k)
	}
	return out, rows.Err()
}

func (d *Database) DeleteAPIKey(id int64) error {
	res, err := d.db.Exec(`DELETE FROM _system_api_keys WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return fmt.Errorf("ERR_KEY_NOT_FOUND: %d", id)
	}
	return nil
}

func (d *Database) initAPIKeys() error {
	_, err := d.db.Exec(`CREATE TABLE IF NOT EXISTS _system_api_keys (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		key_hash TEXT NOT NULL UNIQUE,
		created_at TEXT NOT NULL,
		expires_at TEXT
	)`)
	return err
}
