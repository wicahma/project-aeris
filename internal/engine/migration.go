package engine

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

// ponytail: SD-004 subset — append-only ledger for every schema mutation.
// No rollback (no DOWN plan generator), no checksum gate, no sequence gap
// detection. Ledger is audit-trail only. Upgrade path: add DOWN plan +
// rollback endpoint when destructive ops need undo.

const migrationSchema = `
CREATE TABLE IF NOT EXISTS _system_schema_migrations (
	sequence INTEGER PRIMARY KEY AUTOINCREMENT,
	change_type TEXT NOT NULL,
	target TEXT NOT NULL,
	ddl TEXT NOT NULL,
	checksum TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'APPLIED',
	applied_at INTEGER NOT NULL
)`

type Migration struct {
	Sequence   int64  `json:"sequence"`
	ChangeType string `json:"changeType"`
	Target     string `json:"target"`
	DDL        string `json:"ddl"`
	Checksum   string `json:"checksum"`
	Status     string `json:"status"`
	AppliedAt  int64  `json:"appliedAt"`
}

func (d *Database) initMigrations() error {
	_, err := d.db.Exec(migrationSchema)
	return err
}

func (d *Database) recordMigration(changeType, target, ddl string) {
	sum := sha256.Sum256([]byte(ddl))
	if _, err := d.db.Exec(
		`INSERT INTO _system_schema_migrations (change_type, target, ddl, checksum, status, applied_at) VALUES (?,?,?,?,?,?)`,
		changeType, target, ddl, hex.EncodeToString(sum[:16]), "APPLIED", time.Now().UnixMilli(),
	); err != nil {
		// Ledger write failure should not fail the DDL itself — log only.
		fmt.Printf("migration ledger: %v\n", err)
	}
}

// ListMigrations returns the ledger in reverse-chronological order.
func (d *Database) ListMigrations() ([]Migration, error) {
	rows, err := d.db.Query(`SELECT sequence, change_type, target, ddl, checksum, status, applied_at FROM _system_schema_migrations ORDER BY sequence DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Migration
	for rows.Next() {
		var m Migration
		if err := rows.Scan(&m.Sequence, &m.ChangeType, &m.Target, &m.DDL, &m.Checksum, &m.Status, &m.AppliedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}
