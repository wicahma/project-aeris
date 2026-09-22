package engine

import (
	"context"
	"testing"
	"time"
)

func TestPruneHistory(t *testing.T) {
	db, err := Open(t.TempDir(), "prune", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.db.Exec(`CREATE TABLE t (a INTEGER)`)

	// Insert 5 queries
	for i := 0; i < 5; i++ {
		db.QueryCtx(context.Background(), `SELECT 1`)
	}

	// Wait for history worker
	var entries []HistoryEntry
	for i := 0; i < 100; i++ {
		entries, _ = db.ListHistory("", "", "", 100)
		if len(entries) >= 5 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if len(entries) < 5 {
		t.Fatalf("entries = %d", len(entries))
	}

	// Pin one entry
	if err := db.SetPinned(entries[0].QueryID, true); err != nil {
		t.Fatal(err)
	}

	// TTL prune with 0 days → only cap prune (no TTL)
	deleted, err := db.PruneHistory(0)
	if err != nil {
		t.Fatal(err)
	}
	if deleted != 0 {
		t.Errorf("deleted = %d (under cap)", deleted)
	}

	// TTL prune with 1 day → nothing old enough
	deleted, err = db.PruneHistory(1)
	if err != nil {
		t.Fatal(err)
	}
	if deleted != 0 {
		t.Errorf("deleted = %d (nothing old)", deleted)
	}
}

func TestSetPinnedNotFound(t *testing.T) {
	db, err := Open(t.TempDir(), "pin", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err := db.SetPinned("nonexistent", true); err == nil {
		t.Error("want error for missing query_id")
	}
}
