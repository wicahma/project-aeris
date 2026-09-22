package api

import (
	"net/http"
	"strings"
	"testing"
)

func TestBrowseAndBatchEndpoints(t *testing.T) {
	_, ts := newTestServer(t)
	post(t, ts.URL+"/api/v1/databases", attachRequest{Name: "app", InMemory: true})
	post(t, ts.URL+"/api/v1/databases/app/schema/table", map[string]any{
		"name":    "users",
		"columns": []map[string]any{{"name": "id", "type": "INTEGER", "primaryKey": true}, {"name": "email", "type": "TEXT", "unique": true}},
	})
	post(t, ts.URL+"/api/v1/databases/app/query", queryRequest{SQL: "INSERT INTO users VALUES (1,'a@x'),(2,'b@x'),(3,'c@x')"})

	status, body := get(t, ts.URL+"/api/v1/databases/app/tables/users/data?page=1&page_size=2")
	if status != 200 {
		t.Fatalf("browse = %d %v", status, body)
	}
	data := body["data"].(map[string]any)
	if data["totalRows"].(float64) != 3 || len(data["rows"].([]any)) != 2 {
		t.Errorf("p1: total=%v rows=%d", data["totalRows"], len(data["rows"].([]any)))
	}
	if _, ok := data["rowIds"]; !ok {
		t.Error("missing rowIds")
	}

	status, body = get(t, ts.URL+"/api/v1/databases/app/tables/users/data?sort=email:desc&filter=email:contains:a")
	if status != 200 {
		t.Fatalf("filtered = %d", status)
	}
	data = body["data"].(map[string]any)
	if data["totalRows"].(float64) != 1 {
		t.Errorf("filter total = %v", data["totalRows"])
	}

	status, body = get(t, ts.URL+"/api/v1/databases/app/tables/users/data?sort=nope:asc")
	if status != http.StatusBadRequest || !strings.Contains(body["error"].(string), "ERR_INVALID_COLUMN") {
		t.Errorf("bad sort = %d %v", status, body)
	}
	status, body = get(t, ts.URL+"/api/v1/databases/app/tables/nope/data")
	if status != http.StatusBadRequest || !strings.Contains(body["error"].(string), "ERR_TABLE_NOT_FOUND") {
		t.Errorf("missing table = %d %v", status, body)
	}

	status, body = post(t, ts.URL+"/api/v1/databases/app/tables/users/data/batch", map[string]any{
		"operations": []map[string]any{
			{"op": "insert", "values": map[string]any{"id": 10, "email": "new@x"}},
			{"op": "update", "rowId": 1, "values": map[string]any{"email": "updated@x"}},
			{"op": "delete", "rowId": 3},
		},
	})
	if status != 200 {
		t.Fatalf("batch = %d %v", status, body)
	}
	data = body["data"].(map[string]any)
	if data["applied"].(float64) != 3 {
		t.Errorf("applied = %v", data["applied"])
	}

	status, body = get(t, ts.URL+"/api/v1/databases/app/tables/users/data")
	data = body["data"].(map[string]any)
	if data["totalRows"].(float64) != 3 {
		t.Errorf("after batch total = %v", data["totalRows"])
	}

	status, body = post(t, ts.URL+"/api/v1/databases/app/tables/users/data/batch", map[string]any{
		"operations": []map[string]any{
			{"op": "insert", "values": map[string]any{"id": 11, "email": "x@x"}},
			{"op": "insert", "values": map[string]any{"id": 12, "email": "x@x"}},
		},
	})
	if status != http.StatusConflict {
		t.Errorf("conflict expected = %d %v", status, body)
	}
}
