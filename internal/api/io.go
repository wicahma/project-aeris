package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/wicahma/aeris/internal/engine"
)

// ponytail: sync in-request (≤10MB). Async job + SSE progress deferred — see
// engine/io.go note. Upgrade path: POST returns 202 + job_id, /jobs/{id} polling.

type importBody struct {
	Columns           []string `json:"columns"`
	Delimiter         string   `json:"delimiter"`
	HasHeader         bool     `json:"hasHeader"`
	DuplicateStrategy string   `json:"duplicateStrategy"`
	Data              string   `json:"data"` // raw CSV payload
}

func (s *Server) handleImport(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("db")
	db, ok := s.mgr.Get(name)
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(name))
		return
	}
	table := r.PathValue("table")

	r.Body = http.MaxBytesReader(w, r.Body, engine.ImportMaxBytes+64<<10)
	var body importBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		var mbe *http.MaxBytesError
		if errors.As(err, &mbe) {
			writeErr(w, http.StatusRequestEntityTooLarge, fmt.Errorf("ERR_FILE_TOO_LARGE: import exceeds %d bytes", engine.ImportMaxBytes))
			return
		}
		writeErr(w, http.StatusBadRequest, fmt.Errorf("ERR_INVALID_JSON: %v", err))
		return
	}

	res, err := db.ImportCSV(r.Context(), strings.NewReader(body.Data), &engine.ImportSpec{
		Table:             table,
		Columns:           body.Columns,
		Delimiter:         body.Delimiter,
		HasHeader:         body.HasHeader,
		DuplicateStrategy: body.DuplicateStrategy,
	})
	if err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	writeData(w, res)
}

func (s *Server) handleImportAsync(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("db")
	db, ok := s.mgr.Get(name)
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(name))
		return
	}
	table := r.PathValue("table")

	r.Body = http.MaxBytesReader(w, r.Body, engine.ImportMaxBytes+64<<10)
	var body importBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		var mbe *http.MaxBytesError
		if errors.As(err, &mbe) {
			writeErr(w, http.StatusRequestEntityTooLarge, fmt.Errorf("ERR_FILE_TOO_LARGE: import exceeds %d bytes", engine.ImportMaxBytes))
			return
		}
		writeErr(w, http.StatusBadRequest, fmt.Errorf("ERR_INVALID_JSON: %v", err))
		return
	}

	job := s.jobs.StartImport(db, table, body.Data, &engine.ImportSpec{
		Table:             table,
		Columns:           body.Columns,
		Delimiter:         body.Delimiter,
		HasHeader:         body.HasHeader,
		DuplicateStrategy: body.DuplicateStrategy,
	})
	w.WriteHeader(http.StatusAccepted)
	writeData(w, job)
}

func (s *Server) handleListJobs(w http.ResponseWriter, r *http.Request) {
	writeData(w, s.jobs.List())
}

func (s *Server) handleGetJob(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, fmt.Errorf("ERR_INVALID_ID: %v", err))
		return
	}
	job := s.jobs.Get(id)
	if job == nil {
		writeErr(w, http.StatusNotFound, fmt.Errorf("ERR_JOB_NOT_FOUND: %d", id))
		return
	}
	writeData(w, job)
}

func (s *Server) handleExport(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("db")
	db, ok := s.mgr.Get(name)
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(name))
		return
	}
	table := r.PathValue("table")
	if err := engine.ValidateIdent(table); err != nil || engine.ReservedIdent(table) {
		writeErr(w, http.StatusBadRequest, fmt.Errorf("ERR_TABLE_NAME_INVALID: %q", table))
		return
	}
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "csv"
	}
	if format != "csv" && format != "json" {
		writeErr(w, http.StatusBadRequest, fmt.Errorf("ERR_INVALID_FORMAT: %q (csv|json)", format))
		return
	}

	filename := table + "." + format
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename=%q`, filename))

	var err error
	switch format {
	case "csv":
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		_, err = db.ExportCSV(r.Context(), table, w)
	case "json":
		w.Header().Set("Content-Type", "application/json")
		_, err = db.ExportJSON(r.Context(), table, w)
	}
	if err != nil && err != io.EOF {
		fmt.Printf("export error: %v\n", err)
	}
}
