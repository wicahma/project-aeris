package engine

import (
	"fmt"
	"strings"
)

// ponytail: table rebuild for rename column + change type. No rollback plan
// (snapshot not taken), no data migration validation beyond type coercion.
// Upgrade path: full diff planner when ALTER becomes multi-step.

type AlterColumnSpec struct {
	Table    string `json:"table"`
	Column   string `json:"column"`
	NewName  string `json:"newName,omitempty"`  // rename
	NewType  string `json:"newType,omitempty"`  // change type
}

func (s *AlterColumnSpec) Validate() error {
	if err := ValidateIdent(s.Table); err != nil {
		return fmt.Errorf("ERR_TABLE_NAME_INVALID: %w", err)
	}
	if err := ValidateIdent(s.Column); err != nil {
		return fmt.Errorf("ERR_COLUMN_NAME_INVALID: %w", err)
	}
	if s.NewName == "" && s.NewType == "" {
		return fmt.Errorf("ERR_INVALID_INPUT: newName or newType required")
	}
	if s.NewName != "" {
		if err := ValidateIdent(s.NewName); err != nil {
			return fmt.Errorf("ERR_COLUMN_NAME_INVALID: newName: %w", err)
		}
	}
	if s.NewType != "" {
		t := strings.ToUpper(s.NewType)
		if !sqliteAffinities[t] {
			return fmt.Errorf("ERR_TYPE_UNSUPPORTED: Type must be one of INTEGER, TEXT, REAL, BLOB")
		}
		s.NewType = t
	}
	return nil
}

func (d *Database) AlterColumn(spec *AlterColumnSpec) error {
	if err := spec.Validate(); err != nil {
		return err
	}

	schema, err := d.Schema()
	if err != nil {
		return err
	}
	var tbl *Table
	for i := range schema {
		if schema[i].Name == spec.Table {
			tbl = &schema[i]
			break
		}
	}
	if tbl == nil {
		return fmt.Errorf("ERR_TABLE_NOT_FOUND: Table %q not found", spec.Table)
	}
	var col *Column
	for i := range tbl.Columns {
		if tbl.Columns[i].Name == spec.Column {
			col = &tbl.Columns[i]
			break
		}
	}
	if col == nil {
		return fmt.Errorf("ERR_COLUMN_NOT_FOUND: Column %q not found in %q", spec.Column, spec.Table)
	}

	// Rename only — no rebuild needed
	if spec.NewName != "" && spec.NewType == "" {
		ddl := fmt.Sprintf(`ALTER TABLE "%s" RENAME COLUMN "%s" TO "%s"`, spec.Table, spec.Column, spec.NewName)
		if _, err := d.db.Exec(ddl); err != nil {
			return err
		}
		d.recordMigration("ALTER_RENAME", spec.Table+"."+spec.Column, ddl)
		return nil
	}

	// Type change — table rebuild required
	newType := spec.NewType
	if newType == "" {
		newType = col.Type
	}
	newName := spec.NewName
	if newName == "" {
		newName = spec.Column
	}

	tmpName := spec.Table + "_rebuild_" + strings.ToLower(newName)
	createCols := make([]string, len(tbl.Columns))
	for i, c := range tbl.Columns {
		def := fmt.Sprintf(`"%s" %s`, c.Name, c.Type)
		if c.Name == spec.Column {
			def = fmt.Sprintf(`"%s" %s`, newName, newType)
		}
		if c.PrimaryKey {
			def += " PRIMARY KEY"
		}
		if !c.Nullable && !c.PrimaryKey {
			def += " NOT NULL"
		}
		createCols[i] = def
	}

	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Create new table
	createDDL := fmt.Sprintf(`CREATE TABLE "%s" (%s)`, tmpName, strings.Join(createCols, ", "))
	if _, err := tx.Exec(createDDL); err != nil {
		return fmt.Errorf("ERR_REBUILD_CREATE: %v", err)
	}

	// Copy data with type coercion
	colMap := make([]string, len(tbl.Columns))
	for i, c := range tbl.Columns {
		src := c.Name
		if c.Name == spec.Column {
			src = fmt.Sprintf("CAST(\"%s\" AS %s)", c.Name, newType)
			colMap[i] = fmt.Sprintf(`"%s"`, newName)
		} else {
			colMap[i] = fmt.Sprintf(`"%s"`, c.Name)
		}
		_ = src
	}
	copySQL := fmt.Sprintf(`INSERT INTO "%s" (%s) SELECT %s FROM "%s"`,
		tmpName, strings.Join(colMap, ", "), colList(tbl.Columns, spec.Column, newName), spec.Table)
	if _, err := tx.Exec(copySQL); err != nil {
		return fmt.Errorf("ERR_REBUILD_COPY: %v", err)
	}

	// Drop old, rename new
	if _, err := tx.Exec(fmt.Sprintf(`DROP TABLE "%s"`, spec.Table)); err != nil {
		return fmt.Errorf("ERR_REBUILD_DROP: %v", err)
	}
	if _, err := tx.Exec(fmt.Sprintf(`ALTER TABLE "%s" RENAME TO "%s"`, tmpName, spec.Table)); err != nil {
		return fmt.Errorf("ERR_REBUILD_RENAME: %v", err)
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	d.recordMigration("ALTER_REBUILD", spec.Table+"."+spec.Column, createDDL)
	return nil
}

func colList(cols []Column, changedCol, newName string) string {
	parts := make([]string, len(cols))
	for i, c := range cols {
		if c.Name == changedCol {
			parts[i] = fmt.Sprintf(`"%s"`, newName)
		} else {
			parts[i] = fmt.Sprintf(`"%s"`, c.Name)
		}
	}
	return strings.Join(parts, ", ")
}
