package domain

import (
	"context"
	"time"
)

type QueryResult struct {
	Columns         []string        `json:"columns"`
	ColumnTypes     []string        `json:"column_types"`
	Rows            [][]interface{} `json:"rows"`
	RowsAffected    int64           `json:"rows_affected"`
	LastInsertID    int64           `json:"last_insert_id"`
	ExecutionTimeMs int64           `json:"execution_time_ms"`
	Query           string          `json:"query"`
}

type QueryHistory struct {
	ID              string    `json:"id"`
	DatabaseName    string    `json:"database_name"`
	Query           string    `json:"query"`
	ExecutionTimeMs int64     `json:"execution_time_ms"`
	Status          string    `json:"status"` // "success" or "error"
	ErrorMessage    string    `json:"error_message,omitempty"`
	ExecutedBy      string    `json:"executed_by"`
	ExecutedAt      time.Time `json:"executed_at"`
}

type SavedQuery struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Query        string    `json:"query"`
	DatabaseName string    `json:"database_name"`
	CreatedBy    string    `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type QueryEngine interface {
	Execute(ctx context.Context, dbName string, sqlQuery string, params []interface{}) (*QueryResult, error)
	Explain(ctx context.Context, dbName string, sqlQuery string) (*QueryResult, error)
}

type QueryRepository interface {
	SaveHistory(ctx context.Context, history *QueryHistory) error
	GetHistory(ctx context.Context, limit, offset int) ([]*QueryHistory, error)
	SaveQuery(ctx context.Context, sq *SavedQuery) error
	GetSavedQueries(ctx context.Context) ([]*SavedQuery, error)
	DeleteSavedQuery(ctx context.Context, id string) error
	GetSlowQueriesCount(ctx context.Context, thresholdMs int64) (int64, error)
	GetTotalQueriesCount(ctx context.Context) (int64, error)
}

type QueryUseCase interface {
	ExecuteQuery(ctx context.Context, username, dbName, queryStr string) (*QueryResult, error)
	ExplainQuery(ctx context.Context, dbName, queryStr string) (*QueryResult, error)
	GetHistory(ctx context.Context, limit, offset int) ([]*QueryHistory, error)
	CreateSavedQuery(ctx context.Context, sq *SavedQuery) error
	ListSavedQueries(ctx context.Context) ([]*SavedQuery, error)
	DeleteSavedQuery(ctx context.Context, id string) error
}
