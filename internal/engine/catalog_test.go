package engine

import "testing"

func TestCatalogVerify(t *testing.T) {
	db, err := Open(t.TempDir(), "cat", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	// First verify: no stored hash → no drift
	r1, err := db.VerifyCatalog()
	if err != nil {
		t.Fatal(err)
	}
	if r1.Drift {
		t.Error("expected no drift on first verify")
	}
	if r1.Tables != 0 {
		t.Errorf("expected 0 tables, got %d", r1.Tables)
	}

	// Create table → verify again → no drift (hash updated)
	db.Create(&CreateTableSpec{
		Name: "users",
		Columns: []ColumnDef{
			{Name: "id", Type: "INTEGER", PrimaryKey: true},
			{Name: "name", Type: "TEXT"},
		},
	})
	r2, err := db.VerifyCatalog()
	if err != nil {
		t.Fatal(err)
	}
	if r2.Drift {
		t.Error("expected no drift after create")
	}
	if r2.Tables != 1 {
		t.Errorf("expected 1 table, got %d", r2.Tables)
	}

	// Manual DDL via raw query → drift detected
	db.Query("CREATE TABLE manual (id INTEGER)")
	r3, err := db.VerifyCatalog()
	if err != nil {
		t.Fatal(err)
	}
	if !r3.Drift {
		t.Error("expected drift after manual DDL")
	}
	if r3.Severity != "warn" {
		t.Errorf("expected severity warn, got %s", r3.Severity)
	}

	// Verify again → drift resolved (hash updated)
	r4, err := db.VerifyCatalog()
	if err != nil {
		t.Fatal(err)
	}
	if r4.Drift {
		t.Error("expected drift resolved on second verify")
	}
}
