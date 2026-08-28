package http

import (
	"encoding/json"
	"net/http"
	"strconv"

	"project-aeris/backend/domain"
)

type CRUDHandler struct {
	crudUC domain.CRUDUseCase
}

func NewCRUDHandler(crudUC domain.CRUDUseCase) *CRUDHandler {
	return &CRUDHandler{crudUC: crudUC}
}

func (h *CRUDHandler) List(w http.ResponseWriter, r *http.Request) {
	dbName := r.PathValue("db")
	table := r.PathValue("table")

	if dbName == "" || table == "" {
		httpError(w, "Database and table name required", http.StatusBadRequest)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	filter := r.URL.Query().Get("filter")

	res, err := h.crudUC.ListRecords(r.Context(), dbName, table, limit, offset, filter)
	if err != nil {
		httpError(w, err.Error(), http.StatusBadRequest)
		return
	}

	jsonResponse(w, http.StatusOK, res)
}

func (h *CRUDHandler) Get(w http.ResponseWriter, r *http.Request) {
	dbName := r.PathValue("db")
	table := r.PathValue("table")
	id := r.PathValue("id")

	if dbName == "" || table == "" || id == "" {
		httpError(w, "Database, table and ID required", http.StatusBadRequest)
		return
	}

	record, err := h.crudUC.GetRecord(r.Context(), dbName, table, id)
	if err != nil {
		httpError(w, err.Error(), http.StatusNotFound)
		return
	}

	jsonResponse(w, http.StatusOK, record)
}

func (h *CRUDHandler) Create(w http.ResponseWriter, r *http.Request) {
	dbName := r.PathValue("db")
	table := r.PathValue("table")

	if dbName == "" || table == "" {
		httpError(w, "Database and table name required", http.StatusBadRequest)
		return
	}

	var data map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		httpError(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	record, err := h.crudUC.CreateRecord(r.Context(), dbName, table, data)
	if err != nil {
		httpError(w, err.Error(), http.StatusBadRequest)
		return
	}

	jsonResponse(w, http.StatusCreated, record)
}

func (h *CRUDHandler) Update(w http.ResponseWriter, r *http.Request) {
	dbName := r.PathValue("db")
	table := r.PathValue("table")
	id := r.PathValue("id")

	if dbName == "" || table == "" || id == "" {
		httpError(w, "Database, table and ID required", http.StatusBadRequest)
		return
	}

	var data map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		httpError(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	record, err := h.crudUC.UpdateRecord(r.Context(), dbName, table, id, data)
	if err != nil {
		httpError(w, err.Error(), http.StatusBadRequest)
		return
	}

	jsonResponse(w, http.StatusOK, record)
}

func (h *CRUDHandler) Delete(w http.ResponseWriter, r *http.Request) {
	dbName := r.PathValue("db")
	table := r.PathValue("table")
	id := r.PathValue("id")

	if dbName == "" || table == "" || id == "" {
		httpError(w, "Database, table and ID required", http.StatusBadRequest)
		return
	}

	if err := h.crudUC.DeleteRecord(r.Context(), dbName, table, id); err != nil {
		httpError(w, err.Error(), http.StatusBadRequest)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"message": "Record deleted successfully"})
}
