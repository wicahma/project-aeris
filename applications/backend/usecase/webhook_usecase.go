package usecase

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"project-aeris/backend/domain"
)

type webhookPublisher struct {
	repo       domain.WebhookRepository
	httpClient *http.Client
}

func NewWebhookPublisher(repo domain.WebhookRepository) *webhookPublisher {
	return &webhookPublisher{
		repo: repo,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (w *webhookPublisher) Publish(ctx context.Context, eventType string, payload map[string]interface{}) error {
	webhooks, err := w.repo.List(ctx)
	if err != nil || len(webhooks) == 0 {
		return nil
	}

	event := domain.WebhookEvent{
		ID:        eventType,
		EventType: eventType,
		Payload:   payload,
		Timestamp: time.Now(),
	}

	bodyBytes, err := json.Marshal(event)
	if err != nil {
		return err
	}

	for _, wh := range webhooks {
		if !wh.Active {
			continue
		}

		matched := false
		for _, e := range wh.Events {
			if e == "*" || e == eventType {
				matched = true
				break
			}
		}

		if !matched {
			continue
		}

		// Dispatch async
		go func(config *domain.WebhookConfig, data []byte) {
			req, err := http.NewRequest("POST", config.URL, bytes.NewBuffer(data))
			if err != nil {
				log.Printf("[WEBHOOK] Failed to build request to %s: %v", config.URL, err)
				return
			}

			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("User-Agent", "Project-Aeris-Webhook/1.0")

			if config.Secret != "" {
				mac := hmac.New(sha256.New, []byte(config.Secret))
				mac.Write(data)
				signature := hex.EncodeToString(mac.Sum(nil))
				req.Header.Set("X-Aeris-Signature", "sha256="+signature)
			}

			resp, err := w.httpClient.Do(req)
			if err != nil {
				log.Printf("[WEBHOOK] Dispatch error to %s: %v", config.URL, err)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode >= 400 {
				log.Printf("[WEBHOOK] Received error status %d from %s", resp.StatusCode, config.URL)
			}
		}(wh, bodyBytes)
	}

	return nil
}
