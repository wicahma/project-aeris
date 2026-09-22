package engine

import (
	"fmt"
	"strings"
)

type Index struct {
	Name    string   `json:"name"`
	Table   string   `json:"table"`
	Columns []string `json:"columns"`
	Unique  bool     `json:"unique"`
}

// ListIndexes implements SD-010 subset: read-only list from sqlite_master.
// Two-pass: read names first (close cursor), then query columns per index —
// required because MaxOpenConns(1) and sqlite single-writer.
func (d *Database) ListIndexes() ([]Index, error) {
	rows, err := d.db.Query(`SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_autoindex%' AND tbl_name NOT LIKE '_system_%' ORDER BY name`)
	if err != nil {
		return nil, err
	}
	var out []Index
	for rows.Next() {
		var idx Index
		if err := rows.Scan(&idx.Name, &idx.Table); err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, idx)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	for i := range out {
		cols, unique, err := d.indexMeta(out[i].Name, out[i].Table)
		if err != nil {
			return nil, err
		}
		out[i].Columns = cols
		out[i].Unique = unique
	}
	return out, nil
}

func (d *Database) indexMeta(name, table string) ([]string, bool, error) {
	var unique bool
	uq, err := d.db.Query(`SELECT "unique" FROM pragma_index_list(?) WHERE name = ?`, table, name)
	if err != nil {
		return nil, false, err
	}
	if uq.Next() {
		var u int
		if err := uq.Scan(&u); err != nil {
			uq.Close()
			return nil, false, err
		}
		unique = u == 1
	}
	uq.Close()

	rows, err := d.db.Query(`PRAGMA index_info(` + QuoteIdent(name) + `)`)
	if err != nil {
		return nil, false, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var seqno, cid int
		var colName string
		if err := rows.Scan(&seqno, &cid, &colName); err != nil {
			return nil, false, err
		}
		out = append(out, colName)
	}
	return out, unique, rows.Err()
}

func (d *Database) indexColumns(name string) ([]string, error) {
	rows, err := d.db.Query(`PRAGMA index_info(` + QuoteIdent(name) + `)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var seqno, cid int
		var colName string
		if err := rows.Scan(&seqno, &cid, &colName); err != nil {
			return nil, err
		}
		out = append(out, colName)
	}
	return out, rows.Err()
}

type CreateIndexSpec struct {
	Name    string   `json:"name"`
	Table   string   `json:"table"`
	Columns []string `json:"columns"`
	Unique  bool     `json:"unique"`
}

func (s *CreateIndexSpec) Validate() error {
	if err := ValidateIdent(s.Name); err != nil {
		return fmt.Errorf("ERR_INDEX_NAME_INVALID: %w", err)
	}
	if err := ValidateIdent(s.Table); err != nil {
		return fmt.Errorf("ERR_TABLE_NAME_INVALID: %w", err)
	}
	if len(s.Columns) == 0 {
		return fmt.Errorf("ERR_INDEX_COLUMNS_EMPTY: At least one column is required")
	}
	for _, c := range s.Columns {
		if err := ValidateIdent(c); err != nil {
			return fmt.Errorf("ERR_COLUMN_NAME_INVALID: %w", err)
		}
	}
	return nil
}

func (s *CreateIndexSpec) DDL() string {
	unique := ""
	if s.Unique {
		unique = "UNIQUE "
	}
	quoted := make([]string, len(s.Columns))
	for i, c := range s.Columns {
		quoted[i] = QuoteIdent(c)
	}
	return fmt.Sprintf(`CREATE %sINDEX %s ON %s (%s)`, unique, QuoteIdent(s.Name), QuoteIdent(s.Table), strings.Join(quoted, ", "))
}

func (d *Database) CreateIndex(spec *CreateIndexSpec) error {
	if err := spec.Validate(); err != nil {
		return err
	}
	cols, err := d.columns(spec.Table)
	if err != nil {
		return err
	}
	if len(cols) == 0 {
		return fmt.Errorf("ERR_TABLE_NOT_FOUND: Table %q not found", spec.Table)
	}
	colSet := map[string]bool{}
	for _, c := range cols {
		colSet[strings.ToLower(c.Name)] = true
	}
	for _, c := range spec.Columns {
		if !colSet[strings.ToLower(c)] {
			return fmt.Errorf("ERR_INVALID_COLUMN: Unknown column %q on %q", c, spec.Table)
		}
	}
	if _, err := d.db.Exec(spec.DDL()); err != nil {
		if strings.Contains(err.Error(), "already exists") {
			return fmt.Errorf("ERR_INDEX_NAME_DUPLICATE: Index %q already exists", spec.Name)
		}
		return err
	}
	d.recordMigration("CREATE_INDEX", spec.Table+"."+spec.Name, spec.DDL())
	return nil
}

func (d *Database) DropIndex(name string) error {
	if err := ValidateIdent(name); err != nil {
		return fmt.Errorf("ERR_INDEX_NAME_INVALID: %w", err)
	}
	ddl := `DROP INDEX ` + QuoteIdent(name)
	if _, err := d.db.Exec(ddl); err != nil {
		if strings.Contains(err.Error(), "no such index") {
			return fmt.Errorf("ERR_INDEX_NOT_FOUND: Index %q not found", name)
		}
		return err
	}
	d.recordMigration("DROP_INDEX", name, ddl)
	return nil
}
