package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/wicahma/aeris/internal/engine"
)

// ponytail: Auto REST subset — CRUD endpoints reuse Browse + Batch. No
// per-table enable/disable config (all tables exposed), no GraphQL, no hot
// reload (schema always live via sqlite_master). Upgrade path: config table
// when selective exposure needed.

func (s *Server) handleListRecords(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	table := r.PathValue("table")
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("perPage"))
	if pageSize <= 0 {
		pageSize = 100
	}
	if pageSize > 500 {
		pageSize = 500
	}

	var sorts []engine.DataSort
	for _, s := range q["sort"] {
		col, dir, _ := strings.Cut(s, ":")
		sorts = append(sorts, engine.DataSort{Column: col, Desc: dir == "desc"})
	}
	var filters []engine.DataFilter
	for _, f := range q["filter"] {
		parts := strings.SplitN(f, ":", 3)
		if len(parts) != 3 {
			continue
		}
		filters = append(filters, engine.DataFilter{Column: parts[0], Op: parts[1], Value: parts[2]})
	}

	out, err := db.Browse(table, engine.TableDataRequest{
		Page: page, PageSize: pageSize, Sort: sorts, Filters: filters,
	})
	if err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	writeData(w, out)
}

func (s *Server) handleCreateRecord(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	res, err := db.Batch(r.PathValue("table"), []engine.BatchOp{{
		Op: "insert", Values: body,
	}})
	if err != nil {
		writeErr(w, http.StatusConflict, err)
		return
	}
	writeJSON(w, http.StatusCreated, envelope{Data: res})
}

func (s *Server) handleGetRecord(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	table := r.PathValue("table")
	id := r.PathValue("id")

	// Find PK column
	schema, err := db.Schema()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	var pk string
	for _, t := range schema {
		if t.Name == table {
			for _, c := range t.Columns {
				if c.PrimaryKey {
					pk = c.Name
					break
				}
			}
		}
	}
	if pk == "" {
		writeErr(w, http.StatusBadRequest, fmt.Errorf("ERR_NO_PK: Table %q has no PRIMARY KEY", table))
		return
	}

	res, err := db.QueryCtx(r.Context(), fmt.Sprintf(
		`SELECT * FROM "%s" WHERE "%s" = %s`, table, pk, engine.QuoteLiteral(id),
	))
	if err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	if len(res.Rows) == 0 {
		writeErr(w, http.StatusNotFound, fmt.Errorf("ERR_RECORD_NOT_FOUND: %s.%s = %s", table, pk, id))
		return
	}
	// Map to object
	record := map[string]any{}
	for i, col := range res.Columns {
		record[col] = res.Rows[0][i]
	}
	writeData(w, record)
}

func (s *Server) handleUpdateRecord(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	table := r.PathValue("table")
	id := r.PathValue("id")

	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}

	// Find rowid from PK
	schema, err := db.Schema()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	var pk string
	for _, t := range schema {
		if t.Name == table {
			for _, c := range t.Columns {
				if c.PrimaryKey {
					pk = c.Name
					break
				}
			}
		}
	}
	if pk == "" {
		writeErr(w, http.StatusBadRequest, fmt.Errorf("ERR_NO_PK: Table %q has no PRIMARY KEY", table))
		return
	}

	row, err := db.QueryCtx(r.Context(), fmt.Sprintf(
		`SELECT rowid FROM "%s" WHERE "%s" = %s`, table, pk, engine.QuoteLiteral(id),
	))
	if err != nil || len(row.Rows) == 0 {
		writeErr(w, http.StatusNotFound, fmt.Errorf("ERR_RECORD_NOT_FOUND: %s.%s = %s", table, pk, id))
		return
	}
	rowID, ok := row.Rows[0][0].(int64)
	if !ok {
		if f, ok := row.Rows[0][0].(float64); ok {
			rowID = int64(f)
		} else {
			writeErr(w, http.StatusInternalServerError, fmt.Errorf("ERR_ROWID_TYPE: %T", row.Rows[0][0]))
			return
		}
	}

	res, err := db.Batch(table, []engine.BatchOp{{
		Op: "update", RowID: rowID, Values: body,
	}})
	if err != nil {
		writeErr(w, http.StatusConflict, err)
		return
	}
	writeData(w, res)
}

func (s *Server) handleDeleteRecord(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	table := r.PathValue("table")
	id := r.PathValue("id")

	schema, err := db.Schema()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	var pk string
	for _, t := range schema {
		if t.Name == table {
			for _, c := range t.Columns {
				if c.PrimaryKey {
					pk = c.Name
					break
				}
			}
		}
	}
	if pk == "" {
		writeErr(w, http.StatusBadRequest, fmt.Errorf("ERR_NO_PK: Table %q has no PRIMARY KEY", table))
		return
	}

	res, err := db.QueryCtx(r.Context(), fmt.Sprintf(
		`DELETE FROM "%s" WHERE "%s" = %s`, table, pk, engine.QuoteLiteral(id),
	))
	if err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	if res.RowsAffected == 0 {
		writeErr(w, http.StatusNotFound, fmt.Errorf("ERR_RECORD_NOT_FOUND: %s.%s = %s", table, pk, id))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
