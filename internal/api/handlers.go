package api

import (
	"encoding/json"
	"net/http"

	"github.com/wicahma/aeris/internal/engine"
)

type Server struct {
	mgr *engine.Manager
}

func NewServer(mgr *engine.Manager) *Server {
	return &Server{mgr: mgr}
}

type attachRequest struct {
	Name     string `json:"name"`
	InMemory bool   `json:"inMemory"`
}

type queryRequest struct {
	SQL string `json:"sql"`
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeData(w, map[string]string{"status": "ok"})
}

func (s *Server) handleListDatabases(w http.ResponseWriter, r *http.Request) {
	writeData(w, s.mgr.List())
}

func (s *Server) handleAttach(w http.ResponseWriter, r *http.Request) {
	var req attachRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	db, err := s.mgr.Attach(req.Name, req.InMemory)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	writeData(w, db)
}

func (s *Server) handleDetach(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("db")
	if err := s.mgr.Detach(name); err != nil {
		writeErr(w, http.StatusNotFound, err)
		return
	}
	writeData(w, map[string]string{"detached": name})
}

func (s *Server) handleQuery(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("db")
	db, ok := s.mgr.Get(name)
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(name))
		return
	}
	var req queryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	res, err := db.QueryCtx(r.Context(), req.SQL)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	writeData(w, res)
}

func (s *Server) handleSchema(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("db")
	db, ok := s.mgr.Get(name)
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(name))
		return
	}
	tables, err := db.Schema()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	writeData(w, tables)
}

type errString string

func (e errString) Error() string { return string(e) }

func errNotFound(name string) error {
	return errString("database " + name + " not attached")
}
