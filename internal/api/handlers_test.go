package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/wicahma/aeris/internal/engine"
)

func newTestServer(t *testing.T) (*Server, *httptest.Server) {
	t.Helper()
	mgr, err := engine.NewManager(t.TempDir())
	if err != nil {
		t.Fatalf("NewManager: %v", err)
	}
	t.Cleanup(mgr.Close)
	srv := NewServer(mgr)
	ts := httptest.NewServer(srv.Routes())
	t.Cleanup(ts.Close)
	return srv, ts
}

func post(t *testing.T, url string, body any) (int, map[string]any) {
	t.Helper()
	b, _ := json.Marshal(body)
	resp, err := http.Post(url, "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatalf("POST %s: %v", url, err)
	}
	defer resp.Body.Close()
	var out map[string]any
	json.NewDecoder(resp.Body).Decode(&out)
	return resp.StatusCode, out
}

func get(t *testing.T, url string) (int, map[string]any) {
	t.Helper()
	resp, err := http.Get(url)
	if err != nil {
		t.Fatalf("GET %s: %v", url, err)
	}
	defer resp.Body.Close()
	var out map[string]any
	json.NewDecoder(resp.Body).Decode(&out)
	return resp.StatusCode, out
}

func TestHealth(t *testing.T) {
	_, ts := newTestServer(t)
	status, body := get(t, ts.URL+"/api/v1/health")
	if status != 200 {
		t.Fatalf("status = %d", status)
	}
	data := body["data"].(map[string]any)
	if data["status"] != "ok" {
		t.Errorf("body = %v", body)
	}
}

func TestAttachQuerySchemaFlow(t *testing.T) {
	_, ts := newTestServer(t)

	status, _ := post(t, ts.URL+"/api/v1/databases", attachRequest{Name: "app", InMemory: true})
	if status != 200 {
		t.Fatalf("attach status = %d", status)
	}

	status, body := post(t, ts.URL+"/api/v1/databases/app/query", queryRequest{SQL: "CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)"})
	if status != 200 {
		t.Fatalf("create status = %d, body = %v", status, body)
	}

	status, body = post(t, ts.URL+"/api/v1/databases/app/query", queryRequest{SQL: "INSERT INTO t (v) VALUES ('x')"})
	if status != 200 {
		t.Fatalf("insert status = %d, body = %v", status, body)
	}
	if d := body["data"].(map[string]any); d["rowsAffected"].(float64) != 1 {
		t.Errorf("rowsAffected = %v", d["rowsAffected"])
	}

	status, body = post(t, ts.URL+"/api/v1/databases/app/query", queryRequest{SQL: "SELECT * FROM t"})
	if status != 200 {
		t.Fatalf("select status = %d", status)
	}
	d := body["data"].(map[string]any)
	if len(d["rows"].([]any)) != 1 {
		t.Errorf("rows = %v", d["rows"])
	}

	status, body = get(t, ts.URL+"/api/v1/databases/app/schema")
	if status != 200 {
		t.Fatalf("schema status = %d", status)
	}
	tables := body["data"].([]any)
	if len(tables) != 1 {
		t.Fatalf("tables = %d, want 1", len(tables))
	}
	tb := tables[0].(map[string]any)
	if tb["name"] != "t" || len(tb["columns"].([]any)) != 2 {
		t.Errorf("table = %v", tb)
	}
}

func TestQueryMissingDB(t *testing.T) {
	_, ts := newTestServer(t)
	status, body := post(t, ts.URL+"/api/v1/databases/nope/query", queryRequest{SQL: "SELECT 1"})
	if status != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", status)
	}
	if body["error"] == nil {
		t.Error("expected error field")
	}
}

func TestDetach(t *testing.T) {
	_, ts := newTestServer(t)
	post(t, ts.URL+"/api/v1/databases", attachRequest{Name: "tmp", InMemory: true})

	req, _ := http.NewRequest(http.MethodDelete, ts.URL+"/api/v1/databases/tmp", nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("DELETE: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Errorf("detach status = %d", resp.StatusCode)
	}

	status, _ := post(t, ts.URL+"/api/v1/databases/tmp/query", queryRequest{SQL: "SELECT 1"})
	if status != http.StatusNotFound {
		t.Errorf("after detach status = %d, want 404", status)
	}
}

func TestBadSQL(t *testing.T) {
	_, ts := newTestServer(t)
	post(t, ts.URL+"/api/v1/databases", attachRequest{Name: "app", InMemory: true})
	status, body := post(t, ts.URL+"/api/v1/databases/app/query", queryRequest{SQL: "SELEC oops"})
	if status != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", status)
	}
	if body["error"] == nil || body["error"] == "" {
		t.Error("expected error message")
	}
}
