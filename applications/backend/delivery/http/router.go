package http

import (
	"io"
	"io/fs"
	"net/http"
	"path/filepath"
	"strings"

	"project-aeris/backend/domain"
)

func NewRouter(
	queryUC domain.QueryUseCase,
	schemaUC domain.SchemaUseCase,
	crudUC domain.CRUDUseCase,
	authUC domain.AuthUseCase,
	webhookUC domain.WebhookPublisher,
	monitorUC domain.MonitorUseCase,
	dbMgr domain.DatabaseManager,
) *http.ServeMux {
	mux := http.NewServeMux()

	queryHandler := NewQueryHandler(queryUC)
	schemaHandler := NewSchemaHandler(schemaUC)
	crudHandler := NewCRUDHandler(crudUC)
	authHandler := NewAuthHandler(authUC)
	databaseHandler := NewDatabaseHandler(dbMgr)
	monitorHandler := NewMonitorHandler(monitorUC)

	mux.HandleFunc("POST /api/v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/v1/auth/register", authHandler.Register)
	mux.HandleFunc("GET /api/v1/auth/me", authHandler.GetMe)

	mux.HandleFunc("POST /api/v1/query/execute", queryHandler.Execute)
	mux.HandleFunc("POST /api/v1/query/explain", queryHandler.Explain)
	mux.HandleFunc("GET /api/v1/query/history", queryHandler.GetHistory)
	mux.HandleFunc("GET /api/v1/query/saved", queryHandler.ListSavedQueries)
	mux.HandleFunc("POST /api/v1/query/saved", queryHandler.SaveQuery)
	mux.HandleFunc("DELETE /api/v1/query/saved/{id}", queryHandler.DeleteSavedQuery)

	mux.HandleFunc("GET /api/v1/databases", databaseHandler.List)
	mux.HandleFunc("POST /api/v1/databases", databaseHandler.Create)
	mux.HandleFunc("DELETE /api/v1/databases/{name}", databaseHandler.Delete)
	mux.HandleFunc("GET /api/v1/databases/{name}/stats", databaseHandler.GetStats)

	mux.HandleFunc("GET /api/v1/schema/{db}/tables", schemaHandler.ListTables)
	mux.HandleFunc("GET /api/v1/schema/{db}/{table}", schemaHandler.GetTable)
	mux.HandleFunc("POST /api/v1/schema/{db}/migrate", schemaHandler.RunMigration)

	mux.HandleFunc("GET /api/v1/collections/{db}/{table}", crudHandler.List)
	mux.HandleFunc("GET /api/v1/collections/{db}/{table}/{id}", crudHandler.Get)
	mux.HandleFunc("POST /api/v1/collections/{db}/{table}", crudHandler.Create)
	mux.HandleFunc("PATCH /api/v1/collections/{db}/{table}/{id}", crudHandler.Update)
	mux.HandleFunc("DELETE /api/v1/collections/{db}/{table}/{id}", crudHandler.Delete)

	mux.HandleFunc("GET /api/v1/monitor/stream", monitorHandler.StreamEvents)
	mux.HandleFunc("GET /api/v1/monitor/health", monitorHandler.GetHealth)

	return mux
}

type SinglePageAppHandler struct {
	staticFS fs.FS
}

func NewSinglePageAppHandler(staticFS fs.FS) http.Handler {
	return &SinglePageAppHandler{staticFS: staticFS}
}

func (h *SinglePageAppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/api/") {
		http.NotFound(w, r)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/")
	if path == "" {
		path = "index.html"
	}

	file, err := h.staticFS.Open(path)
	if err != nil {
		path = "index.html"
		file, err = h.staticFS.Open(path)
		if err != nil {
			http.NotFound(w, r)
			return
		}
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		http.NotFound(w, r)
		return
	}

	if stat.IsDir() {
		path = filepath.Join(path, "index.html")
		file, err = h.staticFS.Open(path)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer file.Close()
		stat, _ = file.Stat()
	}

	http.ServeContent(w, r, stat.Name(), stat.ModTime(), file.(io.ReadSeeker))
}