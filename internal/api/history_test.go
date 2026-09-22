package api

import (
	"net/http"
	"testing"
	"time"
)

func TestHistoryEndpoints(t *testing.T) {
	_, ts := newTestServer(t)
	post(t, ts.URL+"/api/v1/databases", attachRequest{Name: "app", InMemory: true})
	post(t, ts.URL+"/api/v1/databases/app/query", queryRequest{SQL: "CREATE TABLE t (id INTEGER)"})
	post(t, ts.URL+"/api/v1/databases/app/query", queryRequest{SQL: "SELECT * FROM t"})
	post(t, ts.URL+"/api/v1/databases/app/query", queryRequest{SQL: "SELEC broken"})

	deadline := time.Now().Add(2 * time.Second)
	var status int
	var body map[string]any
	for time.Now().Before(deadline) {
		status, body = get(t, ts.URL+"/api/v1/databases/app/queries/history")
		items, _ := body["data"].([]any)
		if status == 200 && len(items) >= 3 {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	if status != 200 {
		t.Fatalf("history status = %d", status)
	}
	items := body["data"].([]any)
	if len(items) < 3 {
		t.Fatalf("history items = %d, want >= 3", len(items))
	}
	first := items[0].(map[string]any)
	for _, key := range []string{"queryId", "snippet", "statementType", "status", "executedAt"} {
		if first[key] == nil {
			t.Errorf("missing key %q in %v", key, first)
		}
	}

	status, body = get(t, ts.URL+"/api/v1/databases/app/queries/history?status=FAILED")
	if status != 200 {
		t.Fatalf("filtered status = %d", status)
	}
	for _, it := range body["data"].([]any) {
		if it.(map[string]any)["status"] != "FAILED" {
			t.Error("status filter leaked")
		}
	}

	status, _ = get(t, ts.URL+"/api/v1/databases/nope/queries/history")
	if status != http.StatusNotFound {
		t.Errorf("missing db status = %d", status)
	}
}

func TestSavedQueryEndpoints(t *testing.T) {
	_, ts := newTestServer(t)
	post(t, ts.URL+"/api/v1/databases", attachRequest{Name: "app", InMemory: true})

	status, body := post(t, ts.URL+"/api/v1/databases/app/queries/saved", saveQueryRequest{Title: "Q1", QueryText: "SELECT 1"})
	if status != http.StatusCreated {
		t.Fatalf("create status = %d, body = %v", status, body)
	}
	sq := body["data"].(map[string]any)
	id, _ := sq["id"].(string)
	if id == "" {
		t.Fatal("missing id")
	}

	status, body = get(t, ts.URL+"/api/v1/databases/app/queries/saved")
	if status != 200 || len(body["data"].([]any)) != 1 {
		t.Fatalf("list = %d %v", status, body)
	}

	status, body = post(t, ts.URL+"/api/v1/databases/app/queries/saved", saveQueryRequest{Title: "Q1", QueryText: "SELECT 2"})
	if status != http.StatusBadRequest || body["error"] == nil {
		t.Errorf("duplicate create = %d %v", status, body)
	}

	req, _ := http.NewRequest(http.MethodDelete, ts.URL+"/api/v1/databases/app/queries/saved/"+id, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Errorf("delete status = %d", resp.StatusCode)
	}

	req, _ = http.NewRequest(http.MethodDelete, ts.URL+"/api/v1/databases/app/queries/saved/"+id, nil)
	resp, _ = http.DefaultClient.Do(req)
	resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("double delete status = %d", resp.StatusCode)
	}
}
