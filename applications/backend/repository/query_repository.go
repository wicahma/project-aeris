package repository

import (
	"context"
	"fmt"
	"time"

	"project-aeris/backend/domain"
)

type QueryRepository struct {
	sysDB *SystemDB
}

func NewQueryRepository(sysDB *SystemDB) *QueryRepository {
	return &QueryRepository{sysDB: sysDB}
}

func (r *QueryRepository) SaveHistory(ctx context.Context, history *domain.QueryHistory) error {
	query := `INSERT INTO _system_query_history
		(id, database_name, query, duration_ms, status, error_message, executed_by, executed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?);`

	if history.ID == "" {
		history.ID = fmt.Sprintf("qh_%d", time.Now().UnixNano())
	}
	if history.ExecutedAt.IsZero() {
		history.ExecutedAt = time.Now()
	}

	_, err := r.sysDB.GetDB().ExecContext(ctx, query,
		history.ID,
		history.DatabaseName,
		history.Query,
		history.ExecutionTimeMs,
		history.Status,
		history.ErrorMessage,
		history.ExecutedBy,
		history.ExecutedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to save query history: %w", err)
	}

	return nil
}

func (r *QueryRepository) GetHistory(ctx context.Context, limit, offset int) ([]*domain.QueryHistory, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `SELECT id, database_name, query, duration_ms, status, error_message, executed_by, executed_at
		FROM _system_query_history ORDER BY executed_at DESC LIMIT ? OFFSET ?;`

	rows, err := r.sysDB.GetDB().QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get query history: %w", err)
	}
	defer rows.Close()

	history := make([]*domain.QueryHistory, 0)
	for rows.Next() {
		var h domain.QueryHistory
		var errMsg string
		if err := rows.Scan(&h.ID, &h.DatabaseName, &h.Query, &h.ExecutionTimeMs, &h.Status, &errMsg, &h.ExecutedBy, &h.ExecutedAt); err != nil {
			return nil, err
		}
		h.ErrorMessage = errMsg
		history = append(history, &h)
	}

	return history, nil
}

func (r *QueryRepository) SaveQuery(ctx context.Context, sq *domain.SavedQuery) error {
	if sq.ID == "" {
		sq.ID = fmt.Sprintf("sq_%d", time.Now().UnixNano())
	}
	now := time.Now()
	if sq.CreatedAt.IsZero() {
		sq.CreatedAt = now
	}
	sq.UpdatedAt = now

	query := `INSERT INTO _system_saved_queries
		(id, name, description, query, database_name, created_by, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			description = excluded.description,
			query = excluded.query,
			database_name = excluded.database_name,
			updated_at = excluded.updated_at;`

	_, err := r.sysDB.GetDB().ExecContext(ctx, query,
		sq.ID,
		sq.Name,
		sq.Description,
		sq.Query,
		sq.DatabaseName,
		sq.CreatedBy,
		sq.CreatedAt,
		sq.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to save query: %w", err)
	}

	return nil
}

func (r *QueryRepository) GetSavedQueries(ctx context.Context) ([]*domain.SavedQuery, error) {
	query := `SELECT id, name, description, query, database_name, created_by, created_at, updated_at
		FROM _system_saved_queries ORDER BY created_at DESC;`

	rows, err := r.sysDB.GetDB().QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get saved queries: %w", err)
	}
	defer rows.Close()

	queries := make([]*domain.SavedQuery, 0)
	for rows.Next() {
		var sq domain.SavedQuery
		if err := rows.Scan(&sq.ID, &sq.Name, &sq.Description, &sq.Query, &sq.DatabaseName, &sq.CreatedBy, &sq.CreatedAt, &sq.UpdatedAt); err != nil {
			return nil, err
		}
		queries = append(queries, &sq)
	}

	return queries, nil
}

func (r *QueryRepository) DeleteSavedQuery(ctx context.Context, id string) error {
	query := `DELETE FROM _system_saved_queries WHERE id = ?;`
	res, err := r.sysDB.GetDB().ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("saved query not found")
	}
	return nil
}

func (r *QueryRepository) GetSlowQueriesCount(ctx context.Context, thresholdMs int64) (int64, error) {
	var count int64
	query := `SELECT COUNT(*) FROM _system_query_history WHERE duration_ms >= ?;`
	err := r.sysDB.GetDB().QueryRowContext(ctx, query, thresholdMs).Scan(&count)
	return count, err
}

func (r *QueryRepository) GetTotalQueriesCount(ctx context.Context) (int64, error) {
	var count int64
	query := `SELECT COUNT(*) FROM _system_query_history;`
	err := r.sysDB.GetDB().QueryRowContext(ctx, query).Scan(&count)
	return count, err
}
