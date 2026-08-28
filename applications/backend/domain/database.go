package domain

import (
	"database/sql"
	"time"
)

type DatabaseInfo struct {
	Name        string    `json:"name"`
	FilePath    string    `json:"file_path"`
	SizeBytes   int64     `json:"size_bytes"`
	TableCount  int       `json:"table_count"`
	IsInMemory  bool      `json:"is_in_memory"`
	CreatedAt   time.Time `json:"created_at"`
	Status      string    `json:"status"`
}

type DatabaseManager interface {
	GetConnection(name string) (*sql.DB, error)
	CreateDatabase(name string, inMemory bool) (*DatabaseInfo, error)
	DeleteDatabase(name string) error
	ListDatabases() ([]*DatabaseInfo, error)
	GetDatabaseInfo(name string) (*DatabaseInfo, error)
	CloseAll() error
}
