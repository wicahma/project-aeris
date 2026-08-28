package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"

	httphandler "project-aeris/backend/delivery/http"
	"project-aeris/backend/engine"
	"project-aeris/backend/repository"
	"project-aeris/backend/usecase"
)

//go:embed dist/*
var embeddedFrontend embed.FS

func main() {
	port := flag.Int("port", 8080, "Port for Aeris server")
	dataDir := flag.String("data-dir", "./data", "Directory for database files")
	flag.Parse()

	if err := os.MkdirAll(*dataDir, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	dbMgr, err := engine.NewSQLiteManager(*dataDir)
	if err != nil {
		log.Fatalf("Failed to initialize SQLite manager: %v", err)
	}
	defer dbMgr.CloseAll()

	slowLogger := engine.NewSlowQueryLogger(100)
	sqlExecutor := engine.NewSQLExecutor(dbMgr, slowLogger)

	systemDB, err := repository.NewSystemDB(dbMgr)
	if err != nil {
		log.Fatalf("Failed to initialize system database: %v", err)
	}

	userRepo := repository.NewUserRepository(systemDB)
	webhookRepo := repository.NewWebhookRepository(systemDB)
	queryRepo := repository.NewQueryRepository(systemDB)

	webhookUsecase := usecase.NewWebhookPublisher(webhookRepo)
	monitorUsecase := usecase.NewMonitorUseCase(dbMgr, queryRepo, slowLogger)
	queryUsecase := usecase.NewQueryUseCase(sqlExecutor, queryRepo, webhookUsecase, monitorUsecase)
	schemaUsecase := usecase.NewSchemaUseCase(sqlExecutor, webhookUsecase, monitorUsecase)
	crudUsecase := usecase.NewCRUDUseCase(sqlExecutor)
	authUsecase := usecase.NewAuthUseCase(userRepo, "aeris-jwt-secret-key-2026")

	router := httphandler.NewRouter(
		queryUsecase,
		schemaUsecase,
		crudUsecase,
		authUsecase,
		webhookUsecase,
		monitorUsecase,
		dbMgr,
	)

	subFS, err := fs.Sub(embeddedFrontend, "dist")
	if err != nil {
		log.Printf("Warning: Embedded frontend not available: %v", err)
	} else {
		router.Handle("/", httphandler.NewSinglePageAppHandler(subFS))
	}

	addr := fmt.Sprintf("0.0.0.0:%d", *port)
	fmt.Printf("🚀 Project Aeris Server listening on http://%s\n", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}