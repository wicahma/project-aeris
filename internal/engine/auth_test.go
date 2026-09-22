package engine

import "testing"

func TestAPIKeyLifecycle(t *testing.T) {
	db, err := Open(t.TempDir(), "auth", true)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	// Create
	key, raw, err := db.CreateAPIKey("test", 0)
	if err != nil {
		t.Fatal(err)
	}
	if key.ID == 0 || raw == "" || raw[:6] != "aeris_" {
		t.Errorf("bad key: %+v raw=%s", key, raw)
	}

	// Validate
	k2, err := db.ValidateAPIKey(raw)
	if err != nil {
		t.Fatal(err)
	}
	if k2.Name != "test" {
		t.Errorf("expected test, got %s", k2.Name)
	}

	// Bad key
	_, err = db.ValidateAPIKey("aeris_bad")
	if err == nil {
		t.Error("expected error for bad key")
	}

	// List
	keys, err := db.ListAPIKeys()
	if err != nil {
		t.Fatal(err)
	}
	if len(keys) != 1 {
		t.Errorf("expected 1 key, got %d", len(keys))
	}

	// Delete
	if err := db.DeleteAPIKey(key.ID); err != nil {
		t.Fatal(err)
	}
	_, err = db.ValidateAPIKey(raw)
	if err == nil {
		t.Error("expected error after delete")
	}
}
