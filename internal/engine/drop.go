package engine

import (
	"fmt"
	"strings"
)

// DropColumn implements SD-005 subset: destructive guard — requires confirm
// = column name, rejects PK/last-column, reports rows_affected (=row_count,
// since DROP COLUMN removes data from every row). ponytail: native SQLite
// ALTER TABLE DROP COLUMN (≥3.35). Table-rebuild fallback for older engines
// deferred — modernc.org/sqlite ships 3.53.
func (d *Database) DropColumn(table, column, confirm string) (int64, error) {
	if confirm != column {
		return 0, fmt.Errorf("ERR_CONFIRM_MISMATCH: confirm must equal column name %q", column)
	}
	if err := ValidateIdent(table); err != nil {
		return 0, fmt.Errorf("ERR_TABLE_NAME_INVALID: %w", err)
	}
	if ReservedIdent(table) {
		return 0, fmt.Errorf("ERR_TABLE_NAME_RESERVED: Name is reserved by the system catalog")
	}
	if err := ValidateIdent(column); err != nil {
		return 0, fmt.Errorf("ERR_COLUMN_NAME_INVALID: %w", err)
	}
	schema, err := d.Schema()
	if err != nil {
		return 0, err
	}
	var tbl *Table
	for i := range schema {
		if schema[i].Name == table {
			tbl = &schema[i]
			break
		}
	}
	if tbl == nil {
		return 0, fmt.Errorf("ERR_TABLE_NOT_FOUND: Table %q not found", table)
	}
	var target *Column
	for i := range tbl.Columns {
		if tbl.Columns[i].Name == column {
			target = &tbl.Columns[i]
			break
		}
	}
	if target == nil {
		return 0, fmt.Errorf("ERR_INVALID_COLUMN: Unknown column %q", column)
	}
	if target.PrimaryKey {
		return 0, fmt.Errorf("ERR_PK_DROP: Cannot drop primary key column %q", column)
	}
	if len(tbl.Columns) == 1 {
		return 0, fmt.Errorf("ERR_LAST_COLUMN: Cannot drop the only column in %q", table)
	}
	var rows int64
	if err := d.db.QueryRow(`SELECT COUNT(*) FROM ` + QuoteIdent(table)).Scan(&rows); err != nil {
		return 0, err
	}
	ddl := `ALTER TABLE ` + QuoteIdent(table) + ` DROP COLUMN ` + QuoteIdent(column)
	if _, err := d.db.Exec(ddl); err != nil {
		return 0, fmt.Errorf("ERR_DROP_COLUMN: %w", err)
	}
	d.recordMigration("ALTER_DROP_COL", table+"."+column, ddl)
	return rows, nil
}

// DropTable implements SD-007 subset: guarded drop requiring confirm=name.
func (d *Database) DropTable(name, confirm string) error {
	if err := ValidateIdent(name); err != nil {
		return fmt.Errorf("ERR_TABLE_NAME_INVALID: %w", err)
	}
	if confirm != name {
		return fmt.Errorf("ERR_CONFIRM_NAME_MISMATCH: Type the table name to confirm drop")
	}
	existing, err := d.Schema()
	if err != nil {
		return err
	}
	found := false
	for _, t := range existing {
		if t.Name == name {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("ERR_TABLE_NOT_FOUND: Table %q not found", name)
	}
	if _, err := d.db.Exec(`DROP TABLE ` + QuoteIdent(name)); err != nil {
		return err
	}
	d.recordMigration("DROP", name, `DROP TABLE `+QuoteIdent(name))
	return nil
}

// RenameTable implements SD-007 rename. Non-destructive.
func (d *Database) RenameTable(oldName, newName string) error {
	if err := ValidateIdent(oldName); err != nil {
		return fmt.Errorf("ERR_TABLE_NAME_INVALID: %w", err)
	}
	if err := ValidateIdent(newName); err != nil {
		return fmt.Errorf("ERR_RENAME_NAME_INVALID: %w", err)
	}
	lower := strings.ToLower(newName)
	if strings.HasPrefix(lower, "_system_") || strings.HasPrefix(lower, "sqlite_") {
		return fmt.Errorf("ERR_TABLE_NAME_RESERVED: Name is reserved by the system catalog")
	}
	existing, err := d.Schema()
	if err != nil {
		return err
	}
	found := false
	for _, t := range existing {
		if t.Name == oldName {
			found = true
		}
		if strings.EqualFold(t.Name, newName) {
			return fmt.Errorf("ERR_RENAME_NAME_DUPLICATE: Target name already exists")
		}
	}
	if !found {
		return fmt.Errorf("ERR_TABLE_NOT_FOUND: Table %q not found", oldName)
	}
	ddl := `ALTER TABLE ` + QuoteIdent(oldName) + ` RENAME TO ` + QuoteIdent(newName)
	if _, err := d.db.Exec(ddl); err != nil {
		return err
	}
	d.recordMigration("RENAME", oldName+"→"+newName, ddl)
	return nil
}
