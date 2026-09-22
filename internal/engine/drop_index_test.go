package engine

import (
	"strings"
	"testing"
)

func TestDropTableGuard(t *testing.T) {
	db, err := Open(t.TempDir(), "dr", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.Create(&CreateTableSpec{Name: "t", Columns: []ColumnDef{{Name: "id", Type: "INTEGER", PrimaryKey: true}}})

	if err := db.DropTable("t", "wrong"); err == nil || !strings.Contains(err.Error(), "ERR_CONFIRM_NAME_MISMATCH") {
		t.Errorf("mismatch: %v", err)
	}
	if err := db.DropTable("nope", "nope"); err == nil || !strings.Contains(err.Error(), "ERR_TABLE_NOT_FOUND") {
		t.Errorf("missing: %v", err)
	}
	if err := db.DropTable("t", "t"); err != nil {
		t.Fatalf("drop: %v", err)
	}
	tables, _ := db.Schema()
	for _, tb := range tables {
		if tb.Name == "t" {
			t.Error("t should be dropped")
		}
	}
}

func TestRenameTable(t *testing.T) {
	db, err := Open(t.TempDir(), "rn", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.Create(&CreateTableSpec{Name: "a", Columns: []ColumnDef{{Name: "id", Type: "INTEGER"}}})
	db.Create(&CreateTableSpec{Name: "b", Columns: []ColumnDef{{Name: "id", Type: "INTEGER"}}})

	if err := db.RenameTable("a", "b"); err == nil || !strings.Contains(err.Error(), "ERR_RENAME_NAME_DUPLICATE") {
		t.Errorf("dup: %v", err)
	}
	if err := db.RenameTable("a", "_system_x"); err == nil || !strings.Contains(err.Error(), "ERR_TABLE_NAME_RESERVED") {
		t.Errorf("reserved: %v", err)
	}
	if err := db.RenameTable("nope", "c"); err == nil || !strings.Contains(err.Error(), "ERR_TABLE_NOT_FOUND") {
		t.Errorf("missing: %v", err)
	}
	if err := db.RenameTable("a", "renamed_a"); err != nil {
		t.Fatalf("rename: %v", err)
	}
	tables, _ := db.Schema()
	names := []string{}
	for _, tb := range tables {
		names = append(names, tb.Name)
	}
	if !contains(names, "renamed_a") || contains(names, "a") {
		t.Errorf("tables after rename: %v", names)
	}
}

func contains(s []string, x string) bool {
	for _, v := range s {
		if v == x {
			return true
		}
	}
	return false
}

func TestIndexes(t *testing.T) {
	db, err := Open(t.TempDir(), "idx", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.Create(&CreateTableSpec{Name: "t", Columns: []ColumnDef{
		{Name: "id", Type: "INTEGER", PrimaryKey: true},
		{Name: "email", Type: "TEXT"},
	}})

	spec := &CreateIndexSpec{Name: "idx_email", Table: "t", Columns: []string{"email"}, Unique: true}
	if err := db.CreateIndex(spec); err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := db.CreateIndex(spec); err == nil || !strings.Contains(err.Error(), "ERR_INDEX_NAME_DUPLICATE") {
		t.Errorf("dup: %v", err)
	}
	bad := &CreateIndexSpec{Name: "idx_bad", Table: "t", Columns: []string{"nope"}}
	if err := db.CreateIndex(bad); err == nil || !strings.Contains(err.Error(), "ERR_INVALID_COLUMN") {
		t.Errorf("bad col: %v", err)
	}
	missing := &CreateIndexSpec{Name: "idx_x", Table: "nope", Columns: []string{"x"}}
	if err := db.CreateIndex(missing); err == nil || !strings.Contains(err.Error(), "ERR_TABLE_NOT_FOUND") {
		t.Errorf("missing table: %v", err)
	}

	indexes, err := db.ListIndexes()
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, i := range indexes {
		if i.Name == "idx_email" {
			found = true
			if len(i.Columns) != 1 || i.Columns[0] != "email" {
				t.Errorf("cols = %v", i.Columns)
			}
			if !i.Unique {
				t.Error("unique flag not detected")
			}
		}
		if strings.HasPrefix(i.Table, "_system_") {
			t.Errorf("system index leaked: %v", i.Name)
		}
	}
	if !found {
		t.Errorf("idx_email not in list: %v", indexes)
	}

	if err := db.DropIndex("idx_email"); err != nil {
		t.Fatalf("drop: %v", err)
	}
	if err := db.DropIndex("nope"); err == nil || !strings.Contains(err.Error(), "ERR_INDEX_NOT_FOUND") {
		t.Errorf("drop missing: %v", err)
	}
}

func TestExplain(t *testing.T) {
	db, err := Open(t.TempDir(), "ex", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.Create(&CreateTableSpec{Name: "t", Columns: []ColumnDef{{Name: "id", Type: "INTEGER"}}})
	db.db.Exec(`INSERT INTO t VALUES (1),(2)`)

	nodes, err := db.Explain("SELECT * FROM t WHERE id = 1")
	if err != nil {
		t.Fatal(err)
	}
	if len(nodes) == 0 {
		t.Error("expected at least one plan node")
	}
	if _, err := db.Explain(""); err == nil || !strings.Contains(err.Error(), "ERR_EMPTY_QUERY") {
		t.Errorf("empty: %v", err)
	}
	if _, err := db.Explain("SELEC broken"); err == nil {
		t.Error("expected parse error")
	}
}
