package api

import (
	"encoding/json"
	"net/http"

	"github.com/wicahma/aeris/internal/engine"
)

func (s *Server) handleDropTable(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	confirm := r.URL.Query().Get("confirm")
	if err := db.DropTable(r.PathValue("table"), confirm); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type renameRequest struct {
	NewName string `json:"newName"`
}

func (s *Server) handleRenameTable(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	var req renameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	if err := db.RenameTable(r.PathValue("table"), req.NewName); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	writeData(w, map[string]string{"renamedTo": req.NewName})
}

func (s *Server) handleListIndexes(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	indexes, err := db.ListIndexes()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	writeData(w, indexes)
}

func (s *Server) handleCreateIndex(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	var spec engine.CreateIndexSpec
	if err := json.NewDecoder(r.Body).Decode(&spec); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	if err := db.CreateIndex(&spec); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, envelope{Data: map[string]any{"name": spec.Name, "created": true}})
}

func (s *Server) handleDropIndex(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	if err := db.DropIndex(r.PathValue("index")); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleExplain(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	var req queryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	nodes, err := db.Explain(req.SQL)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	writeData(w, nodes)
}
