package engine

import "testing"

func TestManagerAttachGetDetach(t *testing.T) {
	mgr, err := NewManager(t.TempDir())
	if err != nil {
		t.Fatalf("NewManager: %v", err)
	}
	defer mgr.Close()

	if _, err := mgr.Attach("app", false); err != nil {
		t.Fatalf("Attach: %v", err)
	}
	if _, err := mgr.Attach("cache", true); err != nil {
		t.Fatalf("Attach in-memory: %v", err)
	}

	if got := len(mgr.List()); got != 2 {
		t.Errorf("List len = %d, want 2", got)
	}

	db, ok := mgr.Get("app")
	if !ok {
		t.Fatal("Get(app) not found")
	}
	again, err := mgr.Attach("app", false)
	if err != nil {
		t.Fatalf("re-attach: %v", err)
	}
	if again != db {
		t.Error("re-attach should return same instance")
	}

	if _, ok := mgr.Get("missing"); ok {
		t.Error("Get(missing) should be false")
	}

	if err := mgr.Detach("app"); err != nil {
		t.Fatalf("Detach: %v", err)
	}
	if _, ok := mgr.Get("app"); ok {
		t.Error("app should be detached")
	}
	if err := mgr.Detach("app"); err == nil {
		t.Error("double detach should error")
	}
}

func TestManagerCloseAll(t *testing.T) {
	mgr, _ := NewManager(t.TempDir())
	mgr.Attach("a", true)
	mgr.Attach("b", true)
	mgr.Close()
	if got := len(mgr.List()); got != 0 {
		t.Errorf("after Close, List len = %d, want 0", got)
	}
}
