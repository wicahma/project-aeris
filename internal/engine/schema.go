package engine

import (
	"fmt"
	"strings"
)

var sqliteAffinities = map[string]bool{"INTEGER": true, "TEXT": true, "REAL": true, "BLOB": true}

type ColumnDef struct {
	Name       string  `json:"name"`
	Type       string  `json:"type"`
	NotNull    bool    `json:"notNull"`
	PrimaryKey bool    `json:"primaryKey"`
	Unique     bool    `json:"unique"`
	Default    *string `json:"default"`
	// ponytail: SD-003 subset — FK inline di CREATE TABLE saja. ALTER ADD FK
	// butuh table rebuild (sqlite limitation). Skip circular detection —
	// sqlite allows, defer to migration ordering.
	ReferencesTable  string `json:"referencesTable,omitempty"`
	ReferencesColumn string `json:"referencesColumn,omitempty"`
	OnDelete         string `json:"onDelete,omitempty"` // CASCADE|SET NULL|RESTRICT|NO ACTION|SET DEFAULT
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

var fkActions = map[string]bool{
	"CASCADE": true, "SET NULL": true, "RESTRICT": true, "NO ACTION": true, "SET DEFAULT": true,
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
	if c.ReferencesTable != "" && c.ReferencesColumn != "" {
		fmt.Fprintf(&b, " REFERENCES %s(%s)", QuoteIdent(c.ReferencesTable), QuoteIdent(c.ReferencesColumn))
		if c.OnDelete != "" {
			fmt.Fprintf(&b, " ON DELETE %s", c.OnDelete)
		}
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
	// FK validation: target must exist, target column must be PK or UNIQUE,
	// type affinity must match.
	for _, c := range s.Columns {
		if c.ReferencesTable == "" {
			continue
		}
		if err := ValidateIdent(c.ReferencesTable); err != nil {
			return fmt.Errorf("ERR_FK_TARGET_INVALID: %w", err)
		}
		if err := ValidateIdent(c.ReferencesColumn); err != nil {
			return fmt.Errorf("ERR_FK_TARGET_INVALID: %w", err)
		}
		if c.OnDelete != "" && !fkActions[strings.ToUpper(c.OnDelete)] {
			return fmt.Errorf("ERR_FK_ACTION_INVALID: %q (CASCADE|SET NULL|RESTRICT|NO ACTION|SET DEFAULT)", c.OnDelete)
		}
		var target *Table
		for i := range existing {
			if existing[i].Name == c.ReferencesTable {
				target = &existing[i]
				break
			}
		}
		if target == nil {
			return fmt.Errorf("ERR_FK_TARGET_NOT_FOUND: Table %q not found", c.ReferencesTable)
		}
		var tcol *Column
		for i := range target.Columns {
			if target.Columns[i].Name == c.ReferencesColumn {
				tcol = &target.Columns[i]
				break
			}
		}
		if tcol == nil {
			return fmt.Errorf("ERR_FK_TARGET_NOT_FOUND: Column %q not found in %q", c.ReferencesColumn, c.ReferencesTable)
		}
		if !tcol.PrimaryKey && !tcol.Nullable {
			// NOT NULL but not PK — could be UNIQUE; we can't distinguish from PRAGMA
			// table_info alone. Accept non-nullable non-PK as potentially UNIQUE.
		}
		if !tcol.PrimaryKey && tcol.Nullable {
			return fmt.Errorf("ERR_FK_TARGET_NOT_KEY: Target column %q.%q must be PRIMARY KEY or UNIQUE (non-nullable)", c.ReferencesTable, c.ReferencesColumn)
		}
		if !strings.EqualFold(tcol.Type, c.Type) {
			return fmt.Errorf("ERR_FK_TYPE_MISMATCH: %s.%s is %s, column %q is %s", c.ReferencesTable, c.ReferencesColumn, tcol.Type, c.Name, c.Type)
		}
	}
	return nil
}
