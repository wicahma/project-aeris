package engine

import (
	"strings"
	"testing"
	"time"
)

func TestClassifyStatement(t *testing.T) {
	cases := map[string]string{
		"SELECT 1":                    "SELECT",
		"  select * from t":           "SELECT",
		"-- comment\nSELECT 1":        "SELECT",
		"INSERT INTO t VALUES (1)":    "INSERT",
		"UPDATE t SET a=1":            "UPDATE",
		"DELETE FROM t":               "DELETE",
		"CREATE TABLE t (id INT)":     "DDL",
		"DROP TABLE t":                "DDL",
		"PRAGMA table_info(t)":        "PRAGMA",
		"WITH x AS (SELECT 1) SELECT * FROM x": "WITH",
		"VACUUM":                      "DDL",
		"-- only a comment":           "OTHER",
	}
	for in, want := range cases {
		if got := ClassifyStatement(in); got != want {
			t.Errorf("ClassifyStatement(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestMaskSensitive(t *testing.T) {
	in := "INSERT INTO users (name, password) VALUES ('a', password='hunter2')"
	out := maskSensitive(in)
	if strings.Contains(out, "hunter2") {
		t.Errorf("password not masked: %s", out)
	}
	if !strings.Contains(out, "':redacted:'") {
		t.Errorf("expected redacted marker: %s", out)
	}
	in2 := "SELECT * FROM api_keys WHERE token = 'abc123'"
	if strings.Contains(maskSensitive(in2), "abc123") {
		t.Error("token not masked")
	}
}

func TestHistoryRecording(t *testing.T) {
	db, err := Open(t.TempDir(), "hist", true)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer db.Close()

	db.Query("CREATE TABLE t (id INTEGER)")
	db.Query("INSERT INTO t VALUES (1)")
	db.Query("SELECT * FROM t")
	db.Query("SELEC broken")

	deadline := time.Now().Add(2 * time.Second)
	var entries []HistoryEntry
	for time.Now().Before(deadline) {
		entries, err = db.ListHistory("", "", "", 50)
		if err != nil {
			t.Fatalf("ListHistory: %v", err)
		}
		if len(entries) >= 4 && entries[0].Status == "FAILED" {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	if len(entries) != 4 {
		t.Fatalf("entries = %d, want 4", len(entries))
	}
	if entries[0].StmtType != "OTHER" || entries[0].Status != "FAILED" {
		t.Errorf("latest = %+v", entries[0])
	}
	if entries[1].StmtType != "SELECT" || entries[1].Status != "SUCCESS" {
		t.Errorf("second = %+v", entries[1])
	}
	var failed *HistoryEntry
	for i := range entries {
		if entries[i].Status == "FAILED" {
			failed = &entries[i]
		}
	}
	if failed == nil {
		t.Fatal("failed query not recorded")
	}
	if failed.ErrorMessage == "" {
		t.Error("failed entry should carry error message")
	}
	if len(entries[0].Snippet) > 203 {
		t.Errorf("snippet too long: %d", len(entries[0].Snippet))
	}
}

func TestHistoryFilters(t *testing.T) {
	db, _ := Open(t.TempDir(), "filt", true)
	defer db.Close()
	db.Query("CREATE TABLE t (id INTEGER)")
	db.Query("SELECT 1")

	time.Sleep(50 * time.Millisecond)
	failedOnly, err := db.ListHistory("FAILED", "", "", 50)
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range failedOnly {
		if e.Status != "FAILED" {
			t.Errorf("status filter leaked %q", e.Status)
		}
	}
	selectOnly, _ := db.ListHistory("", "SELECT", "", 50)
	for _, e := range selectOnly {
		if e.StmtType != "SELECT" {
			t.Errorf("type filter leaked %q", e.StmtType)
		}
	}
	keyword, _ := db.ListHistory("", "", "CREATE", 50)
	if len(keyword) == 0 {
		t.Error("keyword filter should match CREATE statement")
	}
}

func TestSavedQueries(t *testing.T) {
	db, _ := Open(t.TempDir(), "saved", true)
	defer db.Close()

	if _, err := db.SaveQuery("", "", "SELECT 1"); err == nil || !strings.Contains(err.Error(), "ERR_SAVED_QUERY_TITLE_INVALID") {
		t.Errorf("empty title: %v", err)
	}
	sq, err := db.SaveQuery("My Query", "Reports", "SELECT 1")
	if err != nil {
		t.Fatalf("SaveQuery: %v", err)
	}
	if sq.ID == "" || sq.CreatedAt == 0 {
		t.Errorf("incomplete saved query: %+v", sq)
	}
	if _, err := db.SaveQuery("My Query", "", "SELECT 2"); err == nil || !strings.Contains(err.Error(), "ERR_SAVED_QUERY_DUPLICATE") {
		t.Errorf("duplicate title: %v", err)
	}

	list, err := db.ListSaved()
	if err != nil || len(list) != 1 {
		t.Fatalf("ListSaved = %v, %v", list, err)
	}
	if list[0].Category != "Reports" {
		t.Errorf("category = %q", list[0].Category)
	}

	if err := db.DeleteSaved(sq.ID); err != nil {
		t.Fatalf("DeleteSaved: %v", err)
	}
	if err := db.DeleteSaved(sq.ID); err == nil || !strings.Contains(err.Error(), "ERR_SAVED_QUERY_NOT_FOUND") {
		t.Errorf("double delete: %v", err)
	}
}

func TestHistoryPrune(t *testing.T) {
	db, _ := Open(t.TempDir(), "prune", true)
	defer db.Close()
	for i := 0; i < 5; i++ {
		db.Query("SELECT 1")
	}
	time.Sleep(100 * time.Millisecond)
	entries, err := db.ListHistory("", "", "", 50)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) > maxHistoryEntries {
		t.Errorf("entries = %d, exceeds max %d", len(entries), maxHistoryEntries)
	}
	if len(entries) != 5 {
		t.Errorf("entries = %d, want 5 (below max)", len(entries))
	}
}
