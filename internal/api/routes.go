package api

import "net/http"

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", s.handleHealth)
	mux.HandleFunc("GET /api/v1/databases", s.handleListDatabases)
	mux.HandleFunc("POST /api/v1/databases", s.handleAttach)
	mux.HandleFunc("DELETE /api/v1/databases/{db}", s.handleDetach)
	mux.HandleFunc("POST /api/v1/databases/{db}/query", s.handleQuery)
	mux.HandleFunc("GET /api/v1/databases/{db}/schema", s.handleSchema)
	mux.HandleFunc("GET /api/v1/databases/{db}/queries/history", s.handleListHistory)
	mux.HandleFunc("POST /api/v1/databases/{db}/schema/table", s.handleCreateTable)
	mux.HandleFunc("POST /api/v1/databases/{db}/schema/table/{table}/column", s.handleAddColumn)
	mux.HandleFunc("GET /api/v1/databases/{db}/tables/{table}/data", s.handleBrowseTable)
	mux.HandleFunc("POST /api/v1/databases/{db}/tables/{table}/data/batch", s.handleBatchTable)
	mux.HandleFunc("GET /api/v1/databases/{db}/queries/saved", s.handleListSaved)
	mux.HandleFunc("POST /api/v1/databases/{db}/queries/saved", s.handleSaveQuery)
	mux.HandleFunc("DELETE /api/v1/databases/{db}/queries/saved/{id}", s.handleDeleteSaved)
	return withCORS(mux)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
