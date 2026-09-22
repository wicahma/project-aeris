package main

import (
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/wicahma/aeris/internal/api"
	"github.com/wicahma/aeris/internal/engine"
	"github.com/wicahma/aeris/web"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(1)
	}
	switch os.Args[1] {
	case "serve":
		serve(os.Args[2:])
	default:
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintln(os.Stderr, "usage: aeris <command>")
	fmt.Fprintln(os.Stderr, "  serve [--port N] [--data-dir PATH]  start the server")
}

func serve(args []string) {
	flags := flag.NewFlagSet("serve", flag.ExitOnError)
	port := flags.Int("port", 8080, "HTTP listen port")
	dataDir := flags.String("data-dir", "./data", "directory for database files")
	flags.Parse(args)

	mgr, err := engine.NewManager(*dataDir)
	if err != nil {
		log.Fatalf("init data dir: %v", err)
	}
	defer mgr.Close()

	srv := api.NewServer(mgr)
	mux := http.NewServeMux()
	mux.Handle("/api/", srv.Routes())
	dist, err := fs.Sub(web.Dist, "dist")
	if err != nil {
		log.Fatalf("embed dist: %v", err)
	}
	mux.Handle("/", spaHandler(dist))

	addr := fmt.Sprintf(":%d", *port)
	log.Printf("aeris listening on %s (data: %s)", addr, *dataDir)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}

func spaHandler(dist fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(dist))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path != "/" {
			if _, err := fs.Stat(dist, path[1:]); err != nil {
				r.URL.Path = "/"
			}
		}
		fileServer.ServeHTTP(w, r)
	})
}
