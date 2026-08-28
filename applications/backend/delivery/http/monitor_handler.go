package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"project-aeris/backend/domain"
)

type MonitorHandler struct {
	monitorUC domain.MonitorUseCase
}

func NewMonitorHandler(monitorUC domain.MonitorUseCase) *MonitorHandler {
	return &MonitorHandler{monitorUC: monitorUC}
}

func (h *MonitorHandler) GetHealth(w http.ResponseWriter, r *http.Request) {
	health, err := h.monitorUC.GetHealth(r.Context())
	if err != nil {
		httpError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, health)
}

func (h *MonitorHandler) StreamEvents(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		httpError(w, "Streaming unsupported", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	ch, unsubscribe := h.monitorUC.SubscribeEvents(r.Context())
	defer unsubscribe()

	// Send initial ping
	fmt.Fprintf(w, "data: %s\n\n", `{"type":"connected","timestamp":"`+time.Now().Format(time.RFC3339)+`"}`)
	flusher.Flush()

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			// Heartbeat
			fmt.Fprintf(w, ": heartbeat\n\n")
			flusher.Flush()
		case event, ok := <-ch:
			if !ok {
				return
			}
			bytes, err := json.Marshal(event)
			if err == nil {
				fmt.Fprintf(w, "data: %s\n\n", string(bytes))
				flusher.Flush()
			}
		}
	}
}
