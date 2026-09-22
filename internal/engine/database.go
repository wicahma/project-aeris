package engine

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

type Column struct {
	Name       string `json:"name"`
	Type       string `json:"type"`
	Nullable   bool   `json:"nullable"`
	Default    any    `json:"default"`
	PrimaryKey bool   `json:"primaryKey"`
}

type Table struct {
	Name    string   `json:"name"`
	Type    string   `json:"type"`
	Columns []Column `json:"columns"`
}

type QueryResult struct {
	Columns      []string `json:"columns"`
	Rows         [][]any  `json:"rows"`
	RowsAffected int64    `json:"rowsAffected"`
	DurationMs   float64  `json:"durationMs"`
}

type Database struct {
	db       *sql.DB
	Name     string `json:"name"`
	Path     string `json:"path"`
	InMemory bool   `json:"inMemory"`

	historyCh chan HistoryEntry
	stopCh    chan struct{}
}

func dsn(path string, inMemory bool) string {
	if inMemory {
		return "file::memory:?cache=shared&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)"
	}
	return fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)", path)
}

func Open(dataDir, name string, inMemory bool) (*Database, error) {
	if err := ValidateIdent(name); err != nil {
		return nil, fmt.Errorf("invalid database name: %w", err)
	}
	path := ":memory:"
	if !inMemory {
		path = filepath.Join(dataDir, name+".db")
	}
	db, err := sql.Open("sqlite", dsn(path, inMemory))
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}
	d := &Database{db: db, Name: name, Path: path, InMemory: inMemory}
	if err := d.initHistory(); err != nil {
		db.Close()
		return nil, err
	}
	return d, nil
}

func (d *Database) Close() error {
	if d.stopCh != nil {
		close(d.stopCh)
		d.stopCh = nil
	}
	return d.db.Close()
}

func (d *Database) Query(sqlText string) (*QueryResult, error) {
	return d.QueryCtx(context.Background(), sqlText)
}

// QueryCtx implements QE-003 subset: context-aware query — client cancel
// (browser tab close, cancel button) kills the sqlite operation via
// QueryContext/ExecContext. ponytail: no explicit cancel endpoint yet; HTTP
// ctx propagation covers it. Add explicit /query/cancel if needed.
func (d *Database) QueryCtx(ctx context.Context, sqlText string) (*QueryResult, error) {
	start := time.Now()
	res := &QueryResult{}
	var execErr error
	defer func() {
		res.DurationMs = float64(time.Since(start).Microseconds()) / 1000
		d.RecordQuery(sqlText, res, execErr)
	}()
	if isReadQuery(sqlText) {
		var rows *sql.Rows
		rows, execErr = d.db.QueryContext(ctx, sqlText)
		if execErr != nil {
			return nil, execErr
		}
		defer rows.Close()
		cols, err := rows.Columns()
		if err != nil {
			execErr = err
			return nil, err
		}
		res.Columns = cols
		for rows.Next() {
			vals := make([]any, len(cols))
			ptrs := make([]any, len(cols))
			for i := range vals {
				ptrs[i] = &vals[i]
			}
			if err := rows.Scan(ptrs...); err != nil {
				execErr = err
				return nil, err
			}
			for i, v := range vals {
				if b, ok := v.([]byte); ok {
					vals[i] = string(b)
				}
			}
			res.Rows = append(res.Rows, vals)
		}
		if err := rows.Err(); err != nil {
			execErr = err
			return nil, err
		}
	} else {
		var r sql.Result
		r, execErr = d.db.ExecContext(ctx, sqlText)
		if execErr != nil {
			return nil, execErr
		}
		res.RowsAffected, _ = r.RowsAffected()
	}
	return res, nil
}

func isReadQuery(q string) bool {
	s := strings.ToUpper(strings.TrimSpace(q))
	return strings.HasPrefix(s, "SELECT") || strings.HasPrefix(s, "PRAGMA") ||
		strings.HasPrefix(s, "EXPLAIN") || strings.HasPrefix(s, "WITH")
}

func (d *Database) Schema() ([]Table, error) {
	rows, err := d.db.Query(`SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_system_%' ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tables []Table
	for rows.Next() {
		var t Table
		if err := rows.Scan(&t.Name, &t.Type); err != nil {
			return nil, err
		}
		tables = append(tables, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for i := range tables {
		cols, err := d.columns(tables[i].Name)
		if err != nil {
			return nil, err
		}
		tables[i].Columns = cols
	}
	return tables, nil
}

func (d *Database) columns(table string) ([]Column, error) {
	if err := ValidateIdent(table); err != nil {
		return nil, err
	}
	rows, err := d.db.Query(fmt.Sprintf(`PRAGMA table_info(%s)`, QuoteIdent(table)))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cols []Column
	for rows.Next() {
		var c Column
		var cid int
		var notnull, pk int
		if err := rows.Scan(&cid, &c.Name, &c.Type, &notnull, &c.Default, &pk); err != nil {
			return nil, err
		}
		c.Nullable = notnull == 0
		c.PrimaryKey = pk > 0
		cols = append(cols, c)
	}
	return cols, rows.Err()
}

// Create implements SD-001/SD-002 (visual schema builder, ponytail scope):
// CREATE TABLE + ALTER ADD COLUMN only. Rebuilds/drop/FK-graph are separate specs.
func (d *Database) Create(spec *CreateTableSpec) error {
	if err := spec.Validate(); err != nil {
		return err
	}
	existing, err := d.Schema()
	if err != nil {
		return err
	}
	if err := spec.ValidateAgainstSchema(existing); err != nil {
		return err
	}
	_, err = d.db.Exec(spec.DDL())
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			return fmt.Errorf("ERR_TABLE_NAME_DUPLICATE: Table %q already exists in this database", spec.Name)
		}
		return err
	}
	return nil
}

type AddColumnSpec struct {
	Table  string    `json:"table"`
	Column ColumnDef `json:"column"`
}

func (d *Database) AddColumn(spec *AddColumnSpec) error {
	if err := ValidateIdent(spec.Table); err != nil {
		return fmt.Errorf("ERR_TABLE_NAME_INVALID: %w", err)
	}
	col := spec.Column
	if err := ValidateIdent(col.Name); err != nil {
		return fmt.Errorf("ERR_COLUMN_NAME_INVALID: %w", err)
	}
	t := strings.ToUpper(col.Type)
	if !sqliteAffinities[t] {
		return fmt.Errorf("ERR_TYPE_UNSUPPORTED: Type must be one of INTEGER, TEXT, REAL, BLOB")
	}
	col.Type = t
	if col.PrimaryKey {
		return fmt.Errorf("ERR_PK_ON_ADD: PRIMARY KEY cannot be added to an existing table via ALTER")
	}
	ddl := fmt.Sprintf(`ALTER TABLE "%s" ADD COLUMN %s`, spec.Table, col.SQL())
	if _, err := d.db.Exec(ddl); err != nil {
		if strings.Contains(err.Error(), "duplicate column name") {
			return fmt.Errorf("ERR_DUPLICATE_COLUMN: Column %q already exists", spec.Column.Name)
		}
		if strings.Contains(err.Error(), "no such table") {
			return fmt.Errorf("ERR_TABLE_NOT_FOUND: Table %q does not exist", spec.Table)
		}
		return err
	}
	return nil
}
