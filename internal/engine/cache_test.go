package engine

import (
	"context"
	"testing"
)

func setupCache(t *testing.T) *Database {
	t.Helper()
	db, err := Open(t.TempDir(), "cache", true)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	db.db.Exec(`CREATE TABLE t (id INTEGER, name TEXT)`)
	db.db.Exec(`WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x<500) INSERT INTO t SELECT x, 'row' || x FROM c`)
	return db
}

func TestQueryPaged_Basic(t *testing.T) {
	db := setupCache(t)
	res, cached, err := db.QueryPaged(context.Background(), `SELECT * FROM t ORDER BY id`, 1, 100)
	if err != nil {
		t.Fatal(err)
	}
	if cached {
		t.Error("first call should not be cached")
	}
	if len(res.Rows) != 100 {
		t.Errorf("rows = %d", len(res.Rows))
	}
	res2, cached2, err := db.QueryPaged(context.Background(), `SELECT * FROM t ORDER BY id`, 2, 100)
	if err != nil {
		t.Fatal(err)
	}
	if !cached2 {
		t.Error("second call should be cached")
	}
	if len(res2.Rows) != 100 {
		t.Errorf("rows = %d", len(res2.Rows))
	}
	if res2.Rows[0][0] != int64(101) {
		t.Errorf("page2 first row = %v", res2.Rows[0][0])
	}
}

func TestQueryPaged_CacheInvalidation(t *testing.T) {
	db := setupCache(t)
	db.QueryPaged(context.Background(), `SELECT * FROM t`, 1, 10)
	if _, err := db.QueryCtx(context.Background(), `INSERT INTO t VALUES (999, 'new')`); err != nil { // DML via QueryCtx → invalidates
		t.Fatal(err)
	}
	res, cached, err := db.QueryPaged(context.Background(), `SELECT * FROM t`, 1, 10)
	if err != nil {
		t.Fatal(err)
	}
	if cached {
		t.Error("should not be cached after DML")
	}
	if len(res.Rows) != 10 {
		t.Errorf("rows = %d", len(res.Rows))
	}
}

func TestQueryPaged_DMLNoPagination(t *testing.T) {
	db := setupCache(t)
	res, cached, err := db.QueryPaged(context.Background(), `INSERT INTO t VALUES (501, 'x')`, 1, 10)
	if err != nil {
		t.Fatal(err)
	}
	if cached {
		t.Error("DML should not be cached")
	}
	if len(res.Columns) != 0 {
		t.Errorf("DML should have no columns")
	}
}

func TestQueryPaged_EmptyPage(t *testing.T) {
	db := setupCache(t)
	res, _, err := db.QueryPaged(context.Background(), `SELECT * FROM t`, 10, 100)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Rows) != 0 {
		t.Errorf("rows = %d", len(res.Rows))
	}
}

func TestQueryPaged_MaxPageSize(t *testing.T) {
	db := setupCache(t)
	res, _, err := db.QueryPaged(context.Background(), `SELECT * FROM t`, 1, 5000)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Rows) != 500 {
		t.Errorf("rows = %d", len(res.Rows))
	}
}
