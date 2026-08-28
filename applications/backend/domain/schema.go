package domain

import (
	"context"
)

type ColumnInfo struct {
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Nullable     bool    `json:"nullable"`
	PrimaryKey   bool    `json:"primary_key"`
	DefaultValue *string `json:"default_value"`
}

type IndexInfo struct {
	Name    string   `json:"name"`
	Columns []string `json:"columns"`
	Unique  bool     `json:"unique"`
}

type ForeignKeyInfo struct {
	ConstraintName string `json:"constraint_name"`
	Column         string `json:"column"`
	ForeignTable   string `json:"foreign_table"`
	ForeignColumn  string `json:"foreign_column"`
}

type TableSchema struct {
	Name        string           `json:"name"`
	Columns     []ColumnInfo     `json:"columns"`
	Indexes     []IndexInfo      `json:"indexes"`
	ForeignKeys []ForeignKeyInfo `json:"foreign_keys"`
	RowCount    int64            `json:"row_count"`
}

type SchemaManager interface {
	GetTables(ctx context.Context, dbName string) ([]string, error)
	GetTableSchema(ctx context.Context, dbName, tableName string) (*TableSchema, error)
	RunMigration(ctx context.Context, dbName, migrationSQL string) error
}

type SchemaUseCase interface {
	InspectDatabase(ctx context.Context, dbName string) ([]*TableSchema, error)
	GetTableSchema(ctx context.Context, dbName, tableName string) (*TableSchema, error)
	ApplyMigration(ctx context.Context, dbName, migrationSQL string) error
}
