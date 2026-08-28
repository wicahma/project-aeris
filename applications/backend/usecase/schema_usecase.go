package usecase

import (
	"context"
	"fmt"
	"time"

	"project-aeris/backend/domain"
)

type schemaUseCase struct {
	schemaMgr domain.SchemaManager
	publisher domain.WebhookPublisher
	monitor   domain.MonitorUseCase
}

func NewSchemaUseCase(
	schemaMgr domain.SchemaManager,
	publisher domain.WebhookPublisher,
	monitor domain.MonitorUseCase,
) domain.SchemaUseCase {
	return &schemaUseCase{
		schemaMgr: schemaMgr,
		publisher: publisher,
		monitor:   monitor,
	}
}

func (s *schemaUseCase) InspectDatabase(ctx context.Context, dbName string) ([]*domain.TableSchema, error) {
	tables, err := s.schemaMgr.GetTables(ctx, dbName)
	if err != nil {
		return nil, fmt.Errorf("failed to get tables: %w", err)
	}

	schemas := make([]*domain.TableSchema, 0, len(tables))
	for _, tbl := range tables {
		ts, err := s.schemaMgr.GetTableSchema(ctx, dbName, tbl)
		if err != nil {
			return nil, fmt.Errorf("failed to inspect table %s: %w", tbl, err)
		}
		schemas = append(schemas, ts)
	}

	return schemas, nil
}

func (s *schemaUseCase) GetTableSchema(ctx context.Context, dbName, tableName string) (*domain.TableSchema, error) {
	return s.schemaMgr.GetTableSchema(ctx, dbName, tableName)
}

func (s *schemaUseCase) ApplyMigration(ctx context.Context, dbName, migrationSQL string) error {
	if err := s.schemaMgr.RunMigration(ctx, dbName, migrationSQL); err != nil {
		return fmt.Errorf("migration error: %w", err)
	}

	if s.monitor != nil {
		s.monitor.BroadcastEvent(&domain.MonitorEvent{
			Type: "schema_migrated",
			Data: map[string]interface{}{
				"database": dbName,
				"sql":      migrationSQL,
			},
			Timestamp: time.Now(),
		})
	}

	if s.publisher != nil {
		_ = s.publisher.Publish(ctx, "schema.migrated", map[string]interface{}{
			"database": dbName,
			"sql":      migrationSQL,
		})
	}

	return nil
}
