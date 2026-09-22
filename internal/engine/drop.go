package engine

import (
	"fmt"
	"strings"
)

// DropTable implements SD-007 subset: guarded drop. confirm must equal name.
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
	if _, err := d.db.Exec(`ALTER TABLE ` + QuoteIdent(oldName) + ` RENAME TO ` + QuoteIdent(newName)); err != nil {
		return err
	}
	return nil
}
