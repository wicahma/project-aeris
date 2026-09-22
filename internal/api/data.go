package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/wicahma/aeris/internal/engine"
)

func (s *Server) handleBrowseTable(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("page_size"))

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

	out, err := db.Browse(r.PathValue("table"), engine.TableDataRequest{
		Page: page, PageSize: pageSize, Sort: sorts, Filters: filters,
	})
	if err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	writeData(w, out)
}

type batchRequest struct {
	Operations []engine.BatchOp `json:"operations"`
}

func (s *Server) handleBatchTable(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	var req batchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	res, err := db.Batch(r.PathValue("table"), req.Operations)
	if err != nil {
		writeErr(w, http.StatusConflict, err)
		return
	}
	writeData(w, res)
}

type updateCellRequest struct {
	RowID  int64  `json:"rowId"`
	Column string `json:"column"`
	Value  any    `json:"value"`
}

func (s *Server) handleUpdateCell(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	var req updateCellRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	res, err := db.Batch(r.PathValue("table"), []engine.BatchOp{{
		Op:     "update",
		RowID:  req.RowID,
		Values: map[string]any{req.Column: req.Value},
	}})
	if err != nil {
		writeErr(w, http.StatusConflict, err)
		return
	}
	writeData(w, res)
}
