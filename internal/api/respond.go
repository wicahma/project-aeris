package api

import (
	"encoding/json"
	"log"
	"net/http"
)

type envelope struct {
	Data  any    `json:"data,omitempty"`
	Error string `json:"error,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("writeJSON: %v", err)
	}
}

func writeData(w http.ResponseWriter, v any) {
	writeJSON(w, http.StatusOK, envelope{Data: v})
}

func writeErr(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, envelope{Error: err.Error()})
}
