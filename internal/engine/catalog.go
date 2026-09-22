package engine

import (
	"crypto/sha256"
	"fmt"
	"sort"
	"strings"
)

// ponytail: schema hash-based drift detection. No separate _system_tables
// catalog — sqlite_master IS the catalog. Verify = recompute hash vs stored.
// Upgrade path: full diff report (added/removed/changed tables) when UI
// needs detailed reconciliation view.

type CatalogVerifyResult struct {
	Hash     string `json:"hash"`
	Stored   string `json:"stored"`
	Drift    bool   `json:"drift"`
	Tables   int    `json:"tables"`
	Severity string `json:"severity"` // "ok" | "warn" | "critical"
}

func (d *Database) VerifyCatalog() (*CatalogVerifyResult, error) {
	schema, err := d.Schema()
	if err != nil {
		return nil, err
	}
	hash := schemaHash(schema)

	var stored string
	row := d.db.QueryRow(`SELECT value FROM _system_catalog WHERE key = 'schema_hash'`)
	if err := row.Scan(&stored); err != nil {
		stored = ""
	}

	// Drift = stored hash exists AND differs from current hash
	drift := stored != "" && stored != hash
	severity := "ok"
	if drift {
		severity = "warn"
	}

	// Store/update hash AFTER drift check
	if _, err := d.db.Exec(`CREATE TABLE IF NOT EXISTS _system_catalog (key TEXT PRIMARY KEY, value TEXT)`); err != nil {
		return nil, err
	}
	if _, err := d.db.Exec(`INSERT OR REPLACE INTO _system_catalog (key, value) VALUES ('schema_hash', ?)`, hash); err != nil {
		return nil, err
	}

	return &CatalogVerifyResult{
		Hash:     hash,
		Stored:   stored,
		Drift:    drift,
		Tables:   len(schema),
		Severity: severity,
	}, nil
}

func schemaHash(tables []Table) string {
	var parts []string
	for _, t := range tables {
		var cols []string
		for _, c := range t.Columns {
			pk := "0"
			if c.PrimaryKey {
				pk = "1"
			}
			cols = append(cols, fmt.Sprintf("%s:%s:%s", c.Name, c.Type, pk))
		}
		sort.Strings(cols)
		parts = append(parts, t.Name+"("+strings.Join(cols, ",")+")")
	}
	sort.Strings(parts)
	h := sha256.Sum256([]byte(strings.Join(parts, ";")))
	return fmt.Sprintf("%x", h[:16])
}
