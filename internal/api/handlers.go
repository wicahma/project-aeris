package api

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"github.com/wicahma/aeris/internal/engine"
)

type Server struct {
	mgr  *engine.Manager
	jobs *engine.JobRunner
	auth bool
}

func NewServer(mgr *engine.Manager) *Server {
	return &Server{mgr: mgr, jobs: engine.NewJobRunner(), auth: os.Getenv("AERIS_AUTH") == "1"}
}

type attachRequest struct {
	Name     string `json:"name"`
	InMemory bool   `json:"inMemory"`
}

type queryRequest struct {
	SQL      string `json:"sql"`
	Page     int    `json:"page,omitempty"`
	PageSize int    `json:"pageSize,omitempty"`
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeData(w, map[string]string{"status": "ok"})
}

// authMiddleware checks API key if AERIS_AUTH=1. Skipped for /auth/keys
// (bootstrap) and when auth disabled (default single-user localhost).
func (s *Server) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !s.auth || r.URL.Path == "/api/v1/health" || strings.HasPrefix(r.URL.Path, "/api/v1/auth/") || strings.Contains(r.URL.Path, "/auth/keys") || (r.URL.Path == "/api/v1/databases" && r.Method == "POST") {
			next.ServeHTTP(w, r)
			return
		}
		key := r.Header.Get("Authorization")
		if key == "" {
			key = r.URL.Query().Get("apikey")
		}
		if key == "" {
			writeErr(w, http.StatusUnauthorized, errString("ERR_AUTH_REQUIRED: API key required"))
			return
		}
		key = strings.TrimPrefix(key, "Bearer ")
		// Try each attached DB until one validates the key
		for _, name := range s.mgr.List() {
			db, ok := s.mgr.Get(name)
			if !ok {
				continue
			}
			if _, err := db.ValidateAPIKey(key); err == nil {
				next.ServeHTTP(w, r)
				return
			}
		}
		writeErr(w, http.StatusUnauthorized, errString("ERR_AUTH_INVALID: Invalid API key"))
	})
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
	if req.Page > 0 || req.PageSize > 0 {
		res, cached, err := db.QueryPaged(r.Context(), req.SQL, req.Page, req.PageSize)
		if err != nil {
			writeErr(w, http.StatusBadRequest, err)
			return
		}
		writeData(w, map[string]any{"result": res, "cached": cached, "page": req.Page, "pageSize": req.PageSize})
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
