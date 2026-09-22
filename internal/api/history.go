package api

import (
	"encoding/json"
	"net/http"
	"strconv"
)

func (s *Server) handleListHistory(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	entries, err := db.ListHistory(q.Get("status"), q.Get("statement_type"), q.Get("q"), limit)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	writeData(w, entries)
}

type saveQueryRequest struct {
	Title     string `json:"title"`
	Category  string `json:"category"`
	QueryText string `json:"queryText"`
}

func (s *Server) handleListSaved(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	saved, err := db.ListSaved()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err)
		return
	}
	writeData(w, saved)
}

func (s *Server) handleSaveQuery(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	var req saveQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	sq, err := db.SaveQuery(req.Title, req.Category, req.QueryText)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, envelope{Data: sq})
}

func (s *Server) handleDeleteSaved(w http.ResponseWriter, r *http.Request) {
	db, ok := s.mgr.Get(r.PathValue("db"))
	if !ok {
		writeErr(w, http.StatusNotFound, errNotFound(r.PathValue("db")))
		return
	}
	if err := db.DeleteSaved(r.PathValue("id")); err != nil {
		writeErr(w, http.StatusNotFound, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
