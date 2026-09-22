package api

import (
	"encoding/json"
	"net/http"

	"github.com/wicahma/aeris/internal/engine"
)

func (s *Server) handleCreateTable(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	var spec engine.CreateTableSpec
	if err := json.NewDecoder(r.Body).Decode(&spec); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	if err := db.Create(&spec); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, envelope{Data: map[string]any{"name": spec.Name, "created": true}})
}

func (s *Server) handleAddColumn(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	var col engine.ColumnDef
	if err := json.NewDecoder(r.Body).Decode(&col); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	spec := engine.AddColumnSpec{Table: r.PathValue("table"), Column: col}
	if err := db.AddColumn(&spec); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, envelope{Data: map[string]any{"table": spec.Table, "column": spec.Column.Name, "added": true}})
}
