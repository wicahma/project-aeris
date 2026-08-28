package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"project-aeris/backend/domain"
)

type WebhookRepository struct {
	sysDB *SystemDB
}

func NewWebhookRepository(sysDB *SystemDB) *WebhookRepository {
	return &WebhookRepository{sysDB: sysDB}
}

func (r *WebhookRepository) Create(ctx context.Context, config *domain.WebhookConfig) error {
	if config.ID == "" {
		config.ID = fmt.Sprintf("wh_%d", time.Now().UnixNano())
	}
	if config.CreatedAt.IsZero() {
		config.CreatedAt = time.Now()
	}

	eventsStr := strings.Join(config.Events, ",")
	activeInt := 0
	if config.Active {
		activeInt = 1
	}

	query := `INSERT INTO _system_webhooks (id, name, url, secret, events, active, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?);`

	_, err := r.sysDB.GetDB().ExecContext(ctx, query,
		config.ID,
		config.Name,
		config.URL,
		config.Secret,
		eventsStr,
		activeInt,
		config.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create webhook: %w", err)
	}

	return nil
}

func (r *WebhookRepository) List(ctx context.Context) ([]*domain.WebhookConfig, error) {
	query := `SELECT id, name, url, secret, events, active, created_at FROM _system_webhooks WHERE active = 1 ORDER BY created_at DESC;`
	rows, err := r.sysDB.GetDB().QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list webhooks: %w", err)
	}
	defer rows.Close()

	webhooks := make([]*domain.WebhookConfig, 0)
	for rows.Next() {
		var wh domain.WebhookConfig
		var eventsStr string
		var activeInt int

		if err := rows.Scan(&wh.ID, &wh.Name, &wh.URL, &wh.Secret, &eventsStr, &activeInt, &wh.CreatedAt); err != nil {
			return nil, err
		}

		if eventsStr != "" {
			wh.Events = strings.Split(eventsStr, ",")
		} else {
			wh.Events = []string{}
		}
		wh.Active = activeInt == 1
		webhooks = append(webhooks, &wh)
	}

	return webhooks, nil
}

func (r *WebhookRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM _system_webhooks WHERE id = ?;`
	_, err := r.sysDB.GetDB().ExecContext(ctx, query, id)
	return err
}
