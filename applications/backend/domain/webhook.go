package domain

import (
	"context"
	"time"
)

type WebhookEvent struct {
	ID        string                 `json:"id"`
	EventType string                 `json:"event_type"` // e.g., "query.executed", "schema.migrated", "database.created"
	Payload   map[string]interface{} `json:"payload"`
	Timestamp time.Time              `json:"timestamp"`
}

type WebhookConfig struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	Secret    string    `json:"secret,omitempty"`
	Events    []string  `json:"events"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
}

type WebhookRepository interface {
	Create(ctx context.Context, config *WebhookConfig) error
	List(ctx context.Context) ([]*WebhookConfig, error)
	Delete(ctx context.Context, id string) error
}

type WebhookPublisher interface {
	Publish(ctx context.Context, eventType string, payload map[string]interface{}) error
}
