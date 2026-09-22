package engine

import (
	"strings"
	"testing"
)

func TestBrowsePagination(t *testing.T) {
	db, err := Open(t.TempDir(), "br", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err := db.Create(&CreateTableSpec{
		Name:    "items",
		Columns: []ColumnDef{{Name: "id", Type: "INTEGER", PrimaryKey: true}, {Name: "name", Type: "TEXT"}},
	}); err != nil {
		t.Fatal(err)
	}
	for i := 1; i <= 7; i++ {
		if _, err := db.db.Exec(`INSERT INTO items (id, name) VALUES (?, ?)`, i, strings.Repeat("x", i)); err != nil {
			t.Fatal(err)
		}
	}

	p1, err := db.Browse("items", TableDataRequest{Page: 1, PageSize: 3})
	if err != nil {
		t.Fatal(err)
	}
	if len(p1.Rows) != 3 || p1.TotalRows != 7 || p1.Page != 1 {
		t.Errorf("p1: rows=%d total=%d page=%d", len(p1.Rows), p1.TotalRows, p1.Page)
	}
	if len(p1.RowIDs) != 3 {
		t.Errorf("rowids = %v", p1.RowIDs)
	}

	p3, _ := db.Browse("items", TableDataRequest{Page: 3, PageSize: 3})
	if len(p3.Rows) != 1 || p3.Page != 3 {
		t.Errorf("p3: rows=%d page=%d", len(p3.Rows), p3.Page)
	}

	clamped, _ := db.Browse("items", TableDataRequest{Page: 99, PageSize: 3})
	if clamped.Page != 3 {
		t.Errorf("clamp: page=%d", clamped.Page)
	}

	if _, err := db.Browse("missing", TableDataRequest{}); err == nil || !strings.Contains(err.Error(), "ERR_TABLE_NOT_FOUND") {
		t.Errorf("missing table: %v", err)
	}
}

func TestBrowseSortAndFilter(t *testing.T) {
	db, err := Open(t.TempDir(), "sf", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.Create(&CreateTableSpec{
		Name:    "t",
		Columns: []ColumnDef{{Name: "id", Type: "INTEGER", PrimaryKey: true}, {Name: "name", Type: "TEXT"}},
	})
	db.db.Exec(`INSERT INTO t VALUES (1,'alpha'),(2,'beta'),(3,'gamma')`)

	out, err := db.Browse("t", TableDataRequest{
		Page: 1, PageSize: 10,
		Sort: []DataSort{{Column: "name", Desc: true}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if out.Rows[0][1] != "gamma" || out.Rows[2][1] != "alpha" {
		t.Errorf("sort desc wrong: %v", out.Rows)
	}

	filtered, err := db.Browse("t", TableDataRequest{
		Page: 1, PageSize: 10,
		Filters: []DataFilter{{Column: "name", Op: "contains", Value: "a"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(filtered.Rows) != 3 {
		t.Errorf("contains 'a': %d rows", len(filtered.Rows))
	}

	if _, err := db.Browse("t", TableDataRequest{
		Filters: []DataFilter{{Column: "name", Op: "evil", Value: "x"}},
	}); err == nil || !strings.Contains(err.Error(), "ERR_INVALID_FILTER_OP") {
		t.Errorf("bad op: %v", err)
	}
	if _, err := db.Browse("t", TableDataRequest{
		Sort: []DataSort{{Column: "nope"}},
	}); err == nil || !strings.Contains(err.Error(), "ERR_INVALID_COLUMN") {
		t.Errorf("bad sort col: %v", err)
	}
}

func TestBatchInsertUpdateDelete(t *testing.T) {
	db, err := Open(t.TempDir(), "b", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.Create(&CreateTableSpec{
		Name:    "users",
		Columns: []ColumnDef{{Name: "id", Type: "INTEGER", PrimaryKey: true}, {Name: "email", Type: "TEXT", Unique: true}},
	})

	res, err := db.Batch("users", []BatchOp{
		{Op: "insert", Values: map[string]any{"id": 1, "email": "a@x"}},
		{Op: "insert", Values: map[string]any{"id": 2, "email": "b@x"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Applied != 2 {
		t.Errorf("applied = %d", res.Applied)
	}

	res, err = db.Batch("users", []BatchOp{
		{Op: "update", RowID: 1, Values: map[string]any{"email": "a2@x"}},
		{Op: "delete", RowID: 2},
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Applied != 2 {
		t.Errorf("applied = %d", res.Applied)
	}

	browsed, _ := db.Browse("users", TableDataRequest{Page: 1, PageSize: 10})
	if browsed.TotalRows != 1 || browsed.Rows[0][1] != "a2@x" {
		t.Errorf("final rows: %v", browsed.Rows)
	}
}

func TestBatchAtomicRollback(t *testing.T) {
	db, err := Open(t.TempDir(), "rb", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.Create(&CreateTableSpec{
		Name:    "t",
		Columns: []ColumnDef{{Name: "id", Type: "INTEGER", PrimaryKey: true}, {Name: "email", Type: "TEXT", Unique: true}},
	})
	db.db.Exec(`INSERT INTO t VALUES (1, 'a@x')`)

	_, err = db.Batch("t", []BatchOp{
		{Op: "insert", Values: map[string]any{"id": 2, "email": "b@x"}},
		{Op: "insert", Values: map[string]any{"id": 3, "email": "a@x"}},
	})
	if err == nil {
		t.Fatal("expected unique violation")
	}

	out, _ := db.Browse("t", TableDataRequest{})
	if out.TotalRows != 1 {
		t.Errorf("rollback failed — total = %d", out.TotalRows)
	}
}

func TestBatchTypeMismatchAndBadColumn(t *testing.T) {
	db, err := Open(t.TempDir(), "tm", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.Create(&CreateTableSpec{
		Name:    "t",
		Columns: []ColumnDef{{Name: "id", Type: "INTEGER", PrimaryKey: true}},
	})

	if _, err := db.Batch("t", []BatchOp{{Op: "insert", Values: map[string]any{"id": "abc"}}}); err == nil || !strings.Contains(err.Error(), "ERR_TYPE_MISMATCH") {
		t.Errorf("type mismatch: %v", err)
	}
	if _, err := db.Batch("t", []BatchOp{{Op: "insert", Values: map[string]any{"nope": 1}}}); err == nil || !strings.Contains(err.Error(), "ERR_INVALID_COLUMN") {
		t.Errorf("bad column: %v", err)
	}
	if _, err := db.Batch("t", []BatchOp{{Op: "update", RowID: 99, Values: map[string]any{"id": 2}}}); err == nil || !strings.Contains(err.Error(), "ERR_ROW_NOT_FOUND") {
		t.Errorf("update missing row: %v", err)
	}
	if _, err := db.Batch("t", []BatchOp{{Op: "update", Values: map[string]any{"id": 1}}}); err == nil || !strings.Contains(err.Error(), "ERR_PK_REQUIRED") {
		t.Errorf("update without rowId: %v", err)
	}
}
