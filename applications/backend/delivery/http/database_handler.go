package http

import (
	"encoding/json"
	"net/http"

	"project-aeris/backend/domain"
)

type DatabaseHandler struct {
	dbMgr domain.DatabaseManager
}

func NewDatabaseHandler(dbMgr domain.DatabaseManager) *DatabaseHandler {
	return &DatabaseHandler{dbMgr: dbMgr}
}

type createDatabaseRequest struct {
	Name     string `json:"name"`
	InMemory bool   `json:"in_memory"`
}

func (h *DatabaseHandler) List(w http.ResponseWriter, r *http.Request) {
	dbs, err := h.dbMgr.ListDatabases()
	if err != nil {
		httpError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, dbs)
}

func (h *DatabaseHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createDatabaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		httpError(w, "Database name required", http.StatusBadRequest)
		return
	}

	info, err := h.dbMgr.CreateDatabase(req.Name, req.InMemory)
	if err != nil {
		httpError(w, err.Error(), http.StatusBadRequest)
		return
	}

	jsonResponse(w, http.StatusCreated, info)
}

func (h *DatabaseHandler) Delete(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if name == "" {
		httpError(w, "Database name required", http.StatusBadRequest)
		return
	}

	if err := h.dbMgr.DeleteDatabase(name); err != nil {
		httpError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"message": "Database deleted"})
}

func (h *DatabaseHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if name == "" {
		httpError(w, "Database name required", http.StatusBadRequest)
		return
	}

	info, err := h.dbMgr.GetDatabaseInfo(name)
	if err != nil {
		httpError(w, err.Error(), http.StatusNotFound)
		return
	}

	jsonResponse(w, http.StatusOK, info)
}
