package api

import (
	"net/http"
	"strings"
	"testing"
)

func TestSchemaBuilderEndpoints(t *testing.T) {
	_, ts := newTestServer(t)
	post(t, ts.URL+"/api/v1/databases", attachRequest{Name: "app", InMemory: true})

	createBody := map[string]any{
		"name": "users",
		"columns": []map[string]any{
			{"name": "id", "type": "INTEGER", "primaryKey": true},
			{"name": "email", "type": "TEXT", "unique": true, "notNull": true},
		},
	}
	status, body := post(t, ts.URL+"/api/v1/databases/app/schema/table", createBody)
	if status != http.StatusCreated {
		t.Fatalf("create = %d %v", status, body)
	}

	status, body = post(t, ts.URL+"/api/v1/databases/app/schema/table", createBody)
	if status != http.StatusBadRequest || !strings.Contains(body["error"].(string), "ERR_TABLE_NAME_DUPLICATE") {
		t.Errorf("dup create = %d %v", status, body)
	}

	status, body = post(t, ts.URL+"/api/v1/databases/app/schema/table", map[string]any{
		"name": "_system_x", "columns": []map[string]any{{"name": "a", "type": "TEXT"}},
	})
	if status != http.StatusBadRequest || !strings.Contains(body["error"].(string), "ERR_TABLE_NAME_RESERVED") {
		t.Errorf("reserved = %d %v", status, body)
	}

	status, body = post(t, ts.URL+"/api/v1/databases/app/schema/table", map[string]any{
		"name": "bad name", "columns": []map[string]any{{"name": "a", "type": "TEXT"}},
	})
	if status != http.StatusBadRequest || !strings.Contains(body["error"].(string), "ERR_TABLE_NAME_INVALID") {
		t.Errorf("invalid name = %d %v", status, body)
	}

	status, _ = post(t, ts.URL+"/api/v1/databases/app/schema/table/users/column", map[string]any{"name": "age", "type": "INTEGER"})
	if status != http.StatusCreated {
		t.Errorf("add column = %d", status)
	}
	status, body = post(t, ts.URL+"/api/v1/databases/app/schema/table/users/column", map[string]any{"name": "age", "type": "INTEGER"})
	if status != http.StatusBadRequest || !strings.Contains(body["error"].(string), "ERR_DUPLICATE_COLUMN") {
		t.Errorf("dup column = %d %v", status, body)
	}
	status, body = post(t, ts.URL+"/api/v1/databases/app/schema/table/nope/column", map[string]any{"name": "x", "type": "TEXT"})
	if status != http.StatusBadRequest || !strings.Contains(body["error"].(string), "ERR_TABLE_NOT_FOUND") {
		t.Errorf("missing table = %d %v", status, body)
	}
	status, body = post(t, ts.URL+"/api/v1/databases/app/schema/table/users/column", map[string]any{"name": "pk2", "type": "INTEGER", "primaryKey": true})
	if status != http.StatusBadRequest || !strings.Contains(body["error"].(string), "ERR_PK_ON_ADD") {
		t.Errorf("pk add = %d %v", status, body)
	}

	status, body = get(t, ts.URL+"/api/v1/databases/app/schema")
	if status != 200 {
		t.Fatal(status)
	}
	tables := body["data"].([]any)
	var users map[string]any
	for _, tb := range tables {
		m := tb.(map[string]any)
		if m["name"] == "users" {
			users = m
		}
	}
	if users == nil {
		t.Fatal("users missing from schema")
	}
	cols := users["columns"].([]any)
	if len(cols) != 3 {
		t.Errorf("users cols = %d, want 3", len(cols))
	}
}
