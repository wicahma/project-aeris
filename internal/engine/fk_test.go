package engine

import (
	"context"
	"strings"
	"testing"
)

func TestForeignKey(t *testing.T) {
	db, err := Open(t.TempDir(), "fk", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	// Parent table
	if err := db.Create(&CreateTableSpec{Name: "users", Columns: []ColumnDef{
		{Name: "id", Type: "INTEGER", PrimaryKey: true},
		{Name: "email", Type: "TEXT", Unique: true},
	}}); err != nil {
		t.Fatal(err)
	}

	// Child table with FK → users.id
	if err := db.Create(&CreateTableSpec{Name: "posts", Columns: []ColumnDef{
		{Name: "id", Type: "INTEGER", PrimaryKey: true},
		{Name: "user_id", Type: "INTEGER", ReferencesTable: "users", ReferencesColumn: "id", OnDelete: "CASCADE"},
		{Name: "title", Type: "TEXT"},
	}}); err != nil {
		t.Fatal(err)
	}

	// FK enforcement: insert invalid user_id fails
	_, err = db.QueryCtx(context.Background(), `INSERT INTO posts VALUES (1, 999, 'x')`)
	if err == nil || !strings.Contains(err.Error(), "FOREIGN KEY") {
		t.Errorf("fk enforcement: %v", err)
	}

	// Valid insert works
	db.QueryCtx(context.Background(), `INSERT INTO users VALUES (1, 'a@x')`)
	if _, err := db.QueryCtx(context.Background(), `INSERT INTO posts VALUES (1, 1, 'hello')`); err != nil {
		t.Errorf("valid insert: %v", err)
	}

	// Cascade delete
	db.QueryCtx(context.Background(), `DELETE FROM users WHERE id = 1`)
	var n int
	db.db.QueryRow(`SELECT COUNT(*) FROM posts`).Scan(&n)
	if n != 0 {
		t.Errorf("cascade: %d rows remain", n)
	}
}

func TestForeignKeyValidation(t *testing.T) {
	db, err := Open(t.TempDir(), "fkv", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.Create(&CreateTableSpec{Name: "users", Columns: []ColumnDef{
		{Name: "id", Type: "INTEGER", PrimaryKey: true},
		{Name: "name", Type: "TEXT"}, // nullable, not unique
	}})

	cases := []struct {
		name string
		spec CreateTableSpec
		want string
	}{
		{"missing table", CreateTableSpec{Name: "a", Columns: []ColumnDef{
			{Name: "x", Type: "INTEGER", ReferencesTable: "nope", ReferencesColumn: "id"},
		}}, "ERR_FK_TARGET_NOT_FOUND"},
		{"missing col", CreateTableSpec{Name: "a", Columns: []ColumnDef{
			{Name: "x", Type: "INTEGER", ReferencesTable: "users", ReferencesColumn: "nope"},
		}}, "ERR_FK_TARGET_NOT_FOUND"},
		{"not key", CreateTableSpec{Name: "a", Columns: []ColumnDef{
			{Name: "x", Type: "TEXT", ReferencesTable: "users", ReferencesColumn: "name"},
		}}, "ERR_FK_TARGET_NOT_KEY"},
		{"type mismatch", CreateTableSpec{Name: "a", Columns: []ColumnDef{
			{Name: "x", Type: "TEXT", ReferencesTable: "users", ReferencesColumn: "id"},
		}}, "ERR_FK_TYPE_MISMATCH"},
		{"bad action", CreateTableSpec{Name: "a", Columns: []ColumnDef{
			{Name: "x", Type: "INTEGER", ReferencesTable: "users", ReferencesColumn: "id", OnDelete: "EXPLODE"},
		}}, "ERR_FK_ACTION_INVALID"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := db.Create(&tc.spec)
			if err == nil {
				t.Fatal("want error")
			}
			if !strings.Contains(err.Error(), tc.want) {
				t.Errorf("err = %v, want %q", err, tc.want)
			}
		})
	}
}
