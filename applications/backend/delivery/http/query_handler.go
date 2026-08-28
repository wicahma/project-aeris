package http

import (
	"encoding/json"
	"net/http"
	"strconv"

	"project-aeris/backend/domain"
)

type QueryHandler struct {
	queryUC domain.QueryUseCase
}

func NewQueryHandler(queryUC domain.QueryUseCase) *QueryHandler {
	return &QueryHandler{queryUC: queryUC}
}

type queryRequest struct {
	Database string `json:"database"`
	Query    string `json:"query"`
}

func (h *QueryHandler) Execute(w http.ResponseWriter, r *http.Request) {
	var req queryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.Query == "" {
		httpError(w, "Query parameter cannot be empty", http.StatusBadRequest)
		return
	}

	user, _ := r.Context().Value(UserContextKey).(*domain.User)
	username := "anonymous"
	if user != nil {
		username = user.Username
	}

	result, err := h.queryUC.ExecuteQuery(r.Context(), username, req.Database, req.Query)
	if err != nil {
		httpError(w, err.Error(), http.StatusBadRequest)
		return
	}

	jsonResponse(w, http.StatusOK, result)
}

func (h *QueryHandler) Explain(w http.ResponseWriter, r *http.Request) {
	var req queryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	result, err := h.queryUC.ExplainQuery(r.Context(), req.Database, req.Query)
	if err != nil {
		httpError(w, err.Error(), http.StatusBadRequest)
		return
	}

	jsonResponse(w, http.StatusOK, result)
}

func (h *QueryHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	history, err := h.queryUC.GetHistory(r.Context(), limit, offset)
	if err != nil {
		httpError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, history)
}

func (h *QueryHandler) ListSavedQueries(w http.ResponseWriter, r *http.Request) {
	queries, err := h.queryUC.ListSavedQueries(r.Context())
	if err != nil {
		httpError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, queries)
}

func (h *QueryHandler) SaveQuery(w http.ResponseWriter, r *http.Request) {
	var sq domain.SavedQuery
	if err := json.NewDecoder(r.Body).Decode(&sq); err != nil {
		httpError(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	user, _ := r.Context().Value(UserContextKey).(*domain.User)
	if user != nil {
		sq.CreatedBy = user.Username
	}

	if err := h.queryUC.CreateSavedQuery(r.Context(), &sq); err != nil {
		httpError(w, err.Error(), http.StatusBadRequest)
		return
	}

	jsonResponse(w, http.StatusCreated, sq)
}

func (h *QueryHandler) DeleteSavedQuery(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		httpError(w, "ID parameter required", http.StatusBadRequest)
		return
	}

	if err := h.queryUC.DeleteSavedQuery(r.Context(), id); err != nil {
		httpError(w, err.Error(), http.StatusNotFound)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"message": "Saved query deleted"})
}
