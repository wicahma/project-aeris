package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/wicahma/aeris/internal/engine"
)

func TestImportAsync(t *testing.T) {
	mgr, err := engine.NewManager(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer mgr.Close()
	s := NewServer(mgr)

	mgr.Attach("app", true)
	s.Routes().ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("POST",
		"/api/v1/databases/app/schema/table",
		strings.NewReader(`{"name":"users","columns":[{"name":"id","type":"INTEGER","primaryKey":true},{"name":"name","type":"TEXT"}]}`)))

	// Start async import
	body := `{"columns":["id","name"],"data":"1,alice\n2,bob\n3,carol"}`
	req := httptest.NewRequest("POST", "/api/v1/databases/app/tables/users/import-async", strings.NewReader(body))
	w := httptest.NewRecorder()
	s.Routes().ServeHTTP(w, req)

	if w.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", w.Code, w.Body.String())
	}
	var resp struct {
		Data struct {
			ID     int64  `json:"id"`
			Status string `json:"status"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Data.ID == 0 {
		t.Fatal("expected job ID")
	}

	// Poll until done
	var job struct {
		Data struct {
			Status string `json:"status"`
			Result *struct {
				InsertedRows int64 `json:"insertedRows"`
			} `json:"result"`
		} `json:"data"`
	}
	for i := 0; i < 20; i++ {
		time.Sleep(100 * time.Millisecond)
		w2 := httptest.NewRecorder()
		s.Routes().ServeHTTP(w2, httptest.NewRequest("GET", "/api/v1/databases/app/jobs/"+json.Number(string(rune('0'+resp.Data.ID))).String(), nil))
		json.Unmarshal(w2.Body.Bytes(), &job)
		if job.Data.Status == "DONE" {
			break
		}
	}
	if job.Data.Status != "DONE" {
		t.Fatalf("job not done: %s", job.Data.Status)
	}
	if job.Data.Result == nil || job.Data.Result.InsertedRows != 3 {
		t.Fatalf("expected 3 inserted, got %+v", job.Data.Result)
	}
}
