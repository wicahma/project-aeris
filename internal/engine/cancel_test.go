package engine

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestQueryCtxCancel(t *testing.T) {
	db, err := Open(t.TempDir(), "c", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.db.Exec(`CREATE TABLE t (a INTEGER)`)
	db.db.Exec(`WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x<10000) INSERT INTO t SELECT x FROM c`)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Millisecond)
	defer cancel()
	start := time.Now()
	_, err = db.QueryCtx(ctx, `WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x<100000000) SELECT COUNT(*) FROM c`)
	if elapsed := time.Since(start); elapsed > 5*time.Second {
		t.Fatalf("cancel took too long: %v", elapsed)
	}
	if err == nil {
		t.Fatal("want error on canceled query")
	}
	if !errors.Is(err, context.DeadlineExceeded) && !errors.Is(err, context.Canceled) {
		t.Logf("err type: %v (acceptable as long as non-nil and fast)", err)
	}
}
