package engine

import "testing"

func TestMigrations(t *testing.T) {
	db, err := Open(t.TempDir(), "mig", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	// No migrations yet
	ms, err := db.ListMigrations()
	if err != nil {
		t.Fatal(err)
	}
	if len(ms) != 0 {
		t.Errorf("migrations = %d", len(ms))
	}

	// Create table → 1 migration
	db.Create(&CreateTableSpec{Name: "users", Columns: []ColumnDef{
		{Name: "id", Type: "INTEGER", PrimaryKey: true},
		{Name: "email", Type: "TEXT"},
	}})
	ms, _ = db.ListMigrations()
	if len(ms) != 1 {
		t.Fatalf("after create: %d", len(ms))
	}
	if ms[0].ChangeType != "CREATE" || ms[0].Target != "users" || ms[0].Status != "APPLIED" {
		t.Errorf("entry = %+v", ms[0])
	}
	if ms[0].Sequence != 1 {
		t.Errorf("sequence = %d", ms[0].Sequence)
	}

	// Add column → 2nd
	db.AddColumn(&AddColumnSpec{Table: "users", Column: ColumnDef{Name: "age", Type: "INTEGER"}})
	// Create index → 3rd
	db.CreateIndex(&CreateIndexSpec{Name: "idx_email", Table: "users", Columns: []string{"email"}})
	// Rename → 4th
	db.RenameTable("users", "app_users")
	// Drop index → 5th
	db.DropIndex("idx_email")
	// Drop column → 6th
	db.DropColumn("app_users", "age", "age")
	// Drop table → 7th
	db.DropTable("app_users", "app_users")

	ms, _ = db.ListMigrations()
	if len(ms) != 7 {
		t.Fatalf("final: %d", len(ms))
	}
	// Reverse chronological
	if ms[0].Sequence != 7 || ms[6].Sequence != 1 {
		t.Errorf("order: first=%d last=%d", ms[0].Sequence, ms[6].Sequence)
	}
	types := []string{"DROP", "ALTER_DROP_COL", "DROP_INDEX", "RENAME", "CREATE_INDEX", "ALTER_ADD", "CREATE"}
	for i, m := range ms {
		if m.ChangeType != types[i] {
			t.Errorf("seq %d: got %s want %s", m.Sequence, m.ChangeType, types[i])
		}
		if m.Checksum == "" {
			t.Errorf("seq %d: empty checksum", m.Sequence)
		}
	}
}
