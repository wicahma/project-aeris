package usecase

import (
	"context"
	"fmt"
	"time"

	"project-aeris/backend/domain"
)

type queryUseCase struct {
	engine     domain.QueryEngine
	repo       domain.QueryRepository
	publisher  domain.WebhookPublisher
	monitor    domain.MonitorUseCase
}

func NewQueryUseCase(
	engine domain.QueryEngine,
	repo domain.QueryRepository,
	publisher domain.WebhookPublisher,
	monitor domain.MonitorUseCase,
) domain.QueryUseCase {
	return &queryUseCase{
		engine:    engine,
		repo:      repo,
		publisher: publisher,
		monitor:   monitor,
	}
}

func (q *queryUseCase) ExecuteQuery(ctx context.Context, username, dbName, queryStr string) (*domain.QueryResult, error) {
	if dbName == "" {
		dbName = "main"
	}
	if username == "" {
		username = "anonymous"
	}

	ctxWithUser := context.WithValue(ctx, "username", username)

	result, err := q.engine.Execute(ctxWithUser, dbName, queryStr, nil)

	status := "success"
	errMsg := ""
	var execTime int64
	if err != nil {
		status = "error"
		errMsg = err.Error()
	} else if result != nil {
		execTime = result.ExecutionTimeMs
	}

	history := &domain.QueryHistory{
		DatabaseName:    dbName,
		Query:           queryStr,
		ExecutionTimeMs: execTime,
		Status:          status,
		ErrorMessage:    errMsg,
		ExecutedBy:      username,
		ExecutedAt:      time.Now(),
	}

	_ = q.repo.SaveHistory(ctx, history)

	// Broadcast monitor event
	if q.monitor != nil {
		q.monitor.BroadcastEvent(&domain.MonitorEvent{
			Type: "query_executed",
			Data: map[string]interface{}{
				"database":     dbName,
				"duration_ms":  execTime,
				"status":       status,
				"executed_by":  username,
				"query_snippet": snippet(queryStr, 100),
			},
			Timestamp: time.Now(),
		})

		if execTime >= 100 {
			q.monitor.BroadcastEvent(&domain.MonitorEvent{
				Type: "slow_query",
				Data: history,
				Timestamp: time.Now(),
			})
		}
	}

	// Publish webhook event async
	if q.publisher != nil {
		_ = q.publisher.Publish(ctx, "query.executed", map[string]interface{}{
			"database":    dbName,
			"status":      status,
			"executed_by": username,
			"duration_ms": execTime,
			"query":       queryStr,
		})
	}

	if err != nil {
		return nil, fmt.Errorf("execution failed: %w", err)
	}

	return result, nil
}

func (q *queryUseCase) ExplainQuery(ctx context.Context, dbName, queryStr string) (*domain.QueryResult, error) {
	if dbName == "" {
		dbName = "main"
	}
	return q.engine.Explain(ctx, dbName, queryStr)
}

func (q *queryUseCase) GetHistory(ctx context.Context, limit, offset int) ([]*domain.QueryHistory, error) {
	return q.repo.GetHistory(ctx, limit, offset)
}

func (q *queryUseCase) CreateSavedQuery(ctx context.Context, sq *domain.SavedQuery) error {
	return q.repo.SaveQuery(ctx, sq)
}

func (q *queryUseCase) ListSavedQueries(ctx context.Context) ([]*domain.SavedQuery, error) {
	return q.repo.GetSavedQueries(ctx)
}

func (q *queryUseCase) DeleteSavedQuery(ctx context.Context, id string) error {
	return q.repo.DeleteSavedQuery(ctx, id)
}

func snippet(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
