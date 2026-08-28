package http

import (
	"encoding/json"
	"net/http"

	"project-aeris/backend/domain"
)

type SchemaHandler struct {
	schemaUC domain.SchemaUseCase
}

func NewSchemaHandler(schemaUC domain.SchemaUseCase) *SchemaHandler {
	return &SchemaHandler{schemaUC: schemaUC}
}

type migrationRequest struct {
	SQL string `json:"sql"`
}

func (h *SchemaHandler) ListTables(w http.ResponseWriter, r *http.Request) {
	dbName := r.PathValue("db")
	if dbName == "" {
		httpError(w, "Database parameter required", http.StatusBadRequest)
		return
	}

	schemas, err := h.schemaUC.InspectDatabase(r.Context(), dbName)
	if err != nil {
		httpError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, schemas)
}

func (h *SchemaHandler) GetTable(w http.ResponseWriter, r *http.Request) {
	dbName := r.PathValue("db")
	table := r.PathValue("table")

	if dbName == "" || table == "" {
		httpError(w, "Database and Table parameters required", http.StatusBadRequest)
		return
	}

	ts, err := h.schemaUC.GetTableSchema(r.Context(), dbName, table)
	if err != nil {
		httpError(w, err.Error(), http.StatusNotFound)
		return
	}

	jsonResponse(w, http.StatusOK, ts)
}

func (h *SchemaHandler) RunMigration(w http.ResponseWriter, r *http.Request) {
	dbName := r.PathValue("db")
	if dbName == "" {
		httpError(w, "Database parameter required", http.StatusBadRequest)
		return
	}

	var req migrationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.SQL == "" {
		httpError(w, "Migration SQL cannot be empty", http.StatusBadRequest)
		return
	}

	if err := h.schemaUC.ApplyMigration(r.Context(), dbName, req.SQL); err != nil {
		httpError(w, err.Error(), http.StatusBadRequest)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"message": "Migration applied successfully"})
}
