package engine

import (
	"strings"
	"testing"
)

func TestAlterColumnRename(t *testing.T) {
	db, err := Open(t.TempDir(), "alter", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	db.Create(&CreateTableSpec{
		Name: "users",
		Columns: []ColumnDef{
			{Name: "id", Type: "INTEGER", PrimaryKey: true},
			{Name: "name", Type: "TEXT"},
		},
	})
	db.Query("INSERT INTO users VALUES (1, 'alice')")

	err = db.AlterColumn(&AlterColumnSpec{
		Table: "users", Column: "name", NewName: "username",
	})
	if err != nil {
		t.Fatal(err)
	}

	res, _ := db.Query("SELECT username FROM users WHERE id = 1")
	if res.Rows[0][0] != "alice" {
		t.Errorf("expected alice, got %v", res.Rows[0][0])
	}
}

func TestAlterColumnTypeChange(t *testing.T) {
	db, err := Open(t.TempDir(), "alter2", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	db.Create(&CreateTableSpec{
		Name: "items",
		Columns: []ColumnDef{
			{Name: "id", Type: "INTEGER", PrimaryKey: true},
			{Name: "price", Type: "TEXT"},
		},
	})
	db.Query("INSERT INTO items VALUES (1, '100')")

	err = db.AlterColumn(&AlterColumnSpec{
		Table: "items", Column: "price", NewType: "INTEGER",
	})
	if err != nil {
		t.Fatal(err)
	}

	res, _ := db.Query("SELECT price, typeof(price) FROM items WHERE id = 1")
	if res.Rows[0][0] != int64(100) {
		t.Errorf("expected 100 (int), got %v (%T)", res.Rows[0][0], res.Rows[0][0])
	}
	if res.Rows[0][1] != "integer" {
		t.Errorf("expected integer type, got %v", res.Rows[0][1])
	}
}

func TestAlterColumnGuards(t *testing.T) {
	db, err := Open(t.TempDir(), "alter3", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	db.Create(&CreateTableSpec{
		Name: "users",
		Columns: []ColumnDef{{Name: "id", Type: "INTEGER", PrimaryKey: true}},
	})

	// No newName/newType
	err = db.AlterColumn(&AlterColumnSpec{Table: "users", Column: "id"})
	if err == nil || !strings.Contains(err.Error(), "ERR_INVALID_INPUT") {
		t.Errorf("expected ERR_INVALID_INPUT, got %v", err)
	}

	// Bad type
	err = db.AlterColumn(&AlterColumnSpec{Table: "users", Column: "id", NewType: "BLOB2"})
	if err == nil || !strings.Contains(err.Error(), "ERR_TYPE_UNSUPPORTED") {
		t.Errorf("expected ERR_TYPE_UNSUPPORTED, got %v", err)
	}

	// Missing column
	err = db.AlterColumn(&AlterColumnSpec{Table: "users", Column: "nope", NewName: "x"})
	if err == nil || !strings.Contains(err.Error(), "ERR_COLUMN_NOT_FOUND") {
		t.Errorf("expected ERR_COLUMN_NOT_FOUND, got %v", err)
	}

	// Missing table
	err = db.AlterColumn(&AlterColumnSpec{Table: "nope", Column: "id", NewName: "x"})
	if err == nil || !strings.Contains(err.Error(), "ERR_TABLE_NOT_FOUND") {
		t.Errorf("expected ERR_TABLE_NOT_FOUND, got %v", err)
	}
}
