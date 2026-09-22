package engine

import (
	"context"
	"testing"
	"time"
)

func TestIndexAdvisor(t *testing.T) {
	db, err := Open(t.TempDir(), "adv", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.Create(&CreateTableSpec{Name: "users", Columns: []ColumnDef{
		{Name: "id", Type: "INTEGER", PrimaryKey: true},
		{Name: "email", Type: "TEXT"},
		{Name: "age", Type: "INTEGER"},
	}})
	db.db.Exec(`INSERT INTO users VALUES (1,'a@x',30),(2,'b@x',25),(3,'c@x',35)`)

	// No history yet → no recommendations
	rep, err := db.IndexAdvisor("users")
	if err != nil {
		t.Fatal(err)
	}
	if rep.Queries != 0 {
		t.Errorf("queries = %d", rep.Queries)
	}

	// Run some SELECTs with WHERE on email — populates history (async worker)
	db.QueryCtx(context.Background(), `SELECT * FROM users WHERE email = 'a@x'`)
	db.QueryCtx(context.Background(), `SELECT * FROM users WHERE email = 'b@x'`)
	db.QueryCtx(context.Background(), `SELECT * FROM users WHERE age > 25`)

	// Wait for history worker to flush
	for i := 0; i < 100; i++ {
		rep, _ = db.IndexAdvisor("users")
		if rep.Queries >= 3 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	rep, err = db.IndexAdvisor("users")
	if err != nil {
		t.Fatal(err)
	}
	if rep.Queries != 3 {
		t.Errorf("queries = %d", rep.Queries)
	}
	if rep.Scans == 0 {
		t.Error("scans = 0")
	}
	if len(rep.Recommend) == 0 {
		t.Error("no recommendations")
	}
	found := false
	for _, r := range rep.Recommend {
		if len(r.Columns) == 1 && (r.Columns[0] == "email" || r.Columns[0] == "age") {
			found = true
		}
	}
	if !found {
		t.Errorf("no email/age recommendation: %+v", rep.Recommend)
	}
}

func TestIndexAdvisorGuards(t *testing.T) {
	db, err := Open(t.TempDir(), "advg", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if _, err := db.IndexAdvisor("nope"); err == nil {
		t.Error("missing table should error")
	}
	if _, err := db.IndexAdvisor("_system_query_history"); err == nil {
		t.Error("reserved should error")
	}
}
