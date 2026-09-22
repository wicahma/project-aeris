package engine

import (
	"fmt"
	"strings"
)

var sqliteAffinities = map[string]bool{"INTEGER": true, "TEXT": true, "REAL": true, "BLOB": true}

type ColumnDef struct {
	Name       string `json:"name"`
	Type       string `json:"type"`
	NotNull    bool   `json:"notNull"`
	PrimaryKey bool   `json:"primaryKey"`
	Unique     bool   `json:"unique"`
	Default    *string `json:"default"`
}

type CreateTableSpec struct {
	Name    string      `json:"name"`
	Columns []ColumnDef `json:"columns"`
}

func (s *CreateTableSpec) Validate() error {
	if err := ValidateIdent(s.Name); err != nil {
		return fmt.Errorf("ERR_TABLE_NAME_INVALID: %w", err)
	}
	lower := strings.ToLower(s.Name)
	if strings.HasPrefix(lower, "_system_") || strings.HasPrefix(lower, "sqlite_") {
		return fmt.Errorf("ERR_TABLE_NAME_RESERVED: Name is reserved by the system catalog")
	}
	if len(s.Columns) == 0 {
		return fmt.Errorf("ERR_TABLE_COLUMNS_EMPTY: At least one column is required")
	}
	seen := map[string]bool{}
	pkCount := 0
	for i, c := range s.Columns {
		if err := ValidateIdent(c.Name); err != nil {
			return fmt.Errorf("ERR_COLUMN_NAME_INVALID: column %d: %w", i, err)
		}
		if seen[strings.ToLower(c.Name)] {
			return fmt.Errorf("ERR_DUPLICATE_COLUMN: Column %q already exists", c.Name)
		}
		seen[strings.ToLower(c.Name)] = true
		t := strings.ToUpper(c.Type)
		if !sqliteAffinities[t] {
			return fmt.Errorf("ERR_TYPE_UNSUPPORTED: Type must be one of INTEGER, TEXT, REAL, BLOB")
		}
		s.Columns[i].Type = t
		if c.PrimaryKey {
			pkCount++
			s.Columns[i].NotNull = true
		}
	}
	if pkCount > 1 {
		return fmt.Errorf("ERR_PK_MULTIPLE: Only one PRIMARY KEY column is supported (composite PK out of scope)")
	}
	return nil
}

func (c ColumnDef) SQL() string {
	var b strings.Builder
	fmt.Fprintf(&b, `"%s" %s`, c.Name, c.Type)
	if c.PrimaryKey {
		b.WriteString(" PRIMARY KEY")
	}
	if c.NotNull && !c.PrimaryKey {
		b.WriteString(" NOT NULL")
	}
	if c.Unique {
		b.WriteString(" UNIQUE")
	}
	if c.Default != nil {
		fmt.Fprintf(&b, " DEFAULT %s", *c.Default)
	}
	return b.String()
}

func (s *CreateTableSpec) DDL() string {
	cols := make([]string, len(s.Columns))
	for i, c := range s.Columns {
		cols[i] = c.SQL()
	}
	return fmt.Sprintf(`CREATE TABLE "%s" (%s)`, s.Name, strings.Join(cols, ", "))
}

func (s *CreateTableSpec) ValidateAgainstSchema(existing []Table) error {
	for _, t := range existing {
		if strings.EqualFold(t.Name, s.Name) {
			return fmt.Errorf("ERR_TABLE_NAME_DUPLICATE: Table %q already exists in this database", s.Name)
		}
	}
	return nil
}
