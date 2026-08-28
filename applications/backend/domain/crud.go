package domain

import (
	"context"
)

type CRUDUseCase interface {
	ListRecords(ctx context.Context, dbName, table string, limit, offset int, filter string) (*QueryResult, error)
	GetRecord(ctx context.Context, dbName, table string, id string) (map[string]interface{}, error)
	CreateRecord(ctx context.Context, dbName, table string, data map[string]interface{}) (map[string]interface{}, error)
	UpdateRecord(ctx context.Context, dbName, table string, id string, data map[string]interface{}) (map[string]interface{}, error)
	DeleteRecord(ctx context.Context, dbName, table string, id string) error
}
