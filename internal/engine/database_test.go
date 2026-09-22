package engine

import (
	"path/filepath"
	"testing"
)

func TestValidateIdent(t *testing.T) {
	valid := []string{"users", "_tmp", "Table1", "a_b_c"}
	for _, v := range valid {
		if err := ValidateIdent(v); err != nil {
			t.Errorf("ValidateIdent(%q) = %v, want nil", v, err)
		}
	}
	invalid := []string{"", "1abc", "a-b", "a b", "a;b", `a"b`, "a.b"}
	for _, v := range invalid {
		if err := ValidateIdent(v); err == nil {
			t.Errorf("ValidateIdent(%q) = nil, want error", v)
		}
	}
}

func TestQuoteIdent(t *testing.T) {
	if got := QuoteIdent("users"); got != `"users"` {
		t.Errorf("QuoteIdent(users) = %q", got)
	}
	if got := QuoteIdent(`we"ird`); got != `"we""ird"` {
		t.Errorf("QuoteIdent(we\"ird) = %q, want escaped quotes", got)
	}
}

func TestIsReadQuery(t *testing.T) {
	read := []string{"SELECT 1", "  select * from t", "PRAGMA table_info(t)", "EXPLAIN SELECT 1", "WITH x AS (SELECT 1) SELECT * FROM x"}
	for _, q := range read {
		if !isReadQuery(q) {
			t.Errorf("isReadQuery(%q) = false, want true", q)
		}
	}
	write := []string{"INSERT INTO t VALUES (1)", "UPDATE t SET a=1", "DELETE FROM t", "CREATE TABLE t (id INT)", "DROP TABLE t"}
	for _, q := range write {
		if isReadQuery(q) {
			t.Errorf("isReadQuery(%q) = true, want false", q)
		}
	}
}

func TestOpenInMemory(t *testing.T) {
	db, err := Open(t.TempDir(), "memdb", true)
	if err != nil {
		t.Fatalf("Open in-memory: %v", err)
	}
	defer db.Close()
	if !db.InMemory {
		t.Error("expected InMemory=true")
	}
	if _, err := db.Query("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)"); err != nil {
		t.Fatalf("create table: %v", err)
	}
	res, err := db.Query(`INSERT INTO users (name) VALUES ('alice'), ('bob')`)
	if err != nil {
		t.Fatalf("insert: %v", err)
	}
	if res.RowsAffected != 2 {
		t.Errorf("RowsAffected = %d, want 2", res.RowsAffected)
	}
	sel, err := db.Query("SELECT id, name FROM users ORDER BY id")
	if err != nil {
		t.Fatalf("select: %v", err)
	}
	if len(sel.Rows) != 2 {
		t.Fatalf("rows = %d, want 2", len(sel.Rows))
	}
	if sel.Columns[0] != "id" || sel.Columns[1] != "name" {
		t.Errorf("columns = %v", sel.Columns)
	}
	if sel.Rows[0][1] != "alice" {
		t.Errorf("row0 name = %v, want alice", sel.Rows[0][1])
	}
}

func TestOpenFilePersists(t *testing.T) {
	dir := t.TempDir()
	db, err := Open(dir, "persist", false)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if _, err := db.Query("CREATE TABLE t (id INTEGER)"); err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := db.Query("INSERT INTO t VALUES (42)"); err != nil {
		t.Fatalf("insert: %v", err)
	}
	db.Close()

	db2, err := Open(dir, "persist", false)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	defer db2.Close()
	res, err := db2.Query("SELECT id FROM t")
	if err != nil {
		t.Fatalf("select after reopen: %v", err)
	}
	if len(res.Rows) != 1 {
		t.Fatalf("rows = %d, want 1 (data must persist)", len(res.Rows))
	}
	want := filepath.Join(dir, "persist.db")
	if db2.Path != want {
		t.Errorf("Path = %q, want %q", db2.Path, want)
	}
}

func TestSchema(t *testing.T) {
	db, err := Open(t.TempDir(), "schemadb", true)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer db.Close()
	stmts := []string{
		"CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, age INTEGER DEFAULT 0)",
		"CREATE VIEW v_users AS SELECT id, name FROM users",
	}
	for _, s := range stmts {
		if _, err := db.Query(s); err != nil {
			t.Fatalf("exec %q: %v", s, err)
		}
	}
	tables, err := db.Schema()
	if err != nil {
		t.Fatalf("Schema: %v", err)
	}
	if len(tables) != 2 {
		t.Fatalf("tables = %d, want 2", len(tables))
	}
	byName := map[string]Table{}
	for _, tb := range tables {
		byName[tb.Name] = tb
	}
	u, ok := byName["users"]
	if !ok {
		t.Fatal("users table missing")
	}
	if u.Type != "table" {
		t.Errorf("users type = %q", u.Type)
	}
	if len(u.Columns) != 3 {
		t.Fatalf("users columns = %d, want 3", len(u.Columns))
	}
	pkFound, nnFound := false, false
	for _, c := range u.Columns {
		if c.Name == "id" && c.PrimaryKey {
			pkFound = true
		}
		if c.Name == "name" && !c.Nullable {
			nnFound = true
		}
	}
	if !pkFound {
		t.Error("id should be primary key")
	}
	if !nnFound {
		t.Error("name should be NOT NULL")
	}
	if byName["v_users"].Type != "view" {
		t.Errorf("v_users type = %q, want view", byName["v_users"].Type)
	}
}

func TestOpenInvalidName(t *testing.T) {
	if _, err := Open(t.TempDir(), "bad;name", false); err == nil {
		t.Error("expected error for invalid name")
	}
}
