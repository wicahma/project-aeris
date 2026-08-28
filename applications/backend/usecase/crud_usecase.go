package usecase

import (
	"context"
	"fmt"
	"strings"

	"project-aeris/backend/domain"
)

type crudUseCase struct {
	engine domain.QueryEngine
}

func NewCRUDUseCase(engine domain.QueryEngine) domain.CRUDUseCase {
	return &crudUseCase{engine: engine}
}

func (c *crudUseCase) ListRecords(ctx context.Context, dbName, table string, limit, offset int, filter string) (*domain.QueryResult, error) {
	if limit <= 0 {
		limit = 50
	}

	query := fmt.Sprintf("SELECT * FROM %s", quoteIdent(table))
	var params []interface{}

	if filter != "" {
		query += " WHERE " + filter
	}

	query += fmt.Sprintf(" LIMIT %d OFFSET %d;", limit, offset)

	return c.engine.Execute(ctx, dbName, query, params)
}

func (c *crudUseCase) GetRecord(ctx context.Context, dbName, table, id string) (map[string]interface{}, error) {
	query := fmt.Sprintf("SELECT * FROM %s WHERE id = ? OR rowid = ? LIMIT 1;", quoteIdent(table))
	res, err := c.engine.Execute(ctx, dbName, query, []interface{}{id, id})
	if err != nil {
		return nil, err
	}

	if len(res.Rows) == 0 {
		return nil, fmt.Errorf("record not found")
	}

	rowMap := make(map[string]interface{})
	for i, col := range res.Columns {
		rowMap[col] = res.Rows[0][i]
	}

	return rowMap, nil
}

func (c *crudUseCase) CreateRecord(ctx context.Context, dbName, table string, data map[string]interface{}) (map[string]interface{}, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("data payload cannot be empty")
	}

	cols := make([]string, 0, len(data))
	placeholders := make([]string, 0, len(data))
	vals := make([]interface{}, 0, len(data))

	for k, v := range data {
		cols = append(cols, quoteIdent(k))
		placeholders = append(placeholders, "?")
		vals = append(vals, v)
	}

	query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s);",
		quoteIdent(table),
		strings.Join(cols, ", "),
		strings.Join(placeholders, ", "),
	)

	res, err := c.engine.Execute(ctx, dbName, query, vals)
	if err != nil {
		return nil, fmt.Errorf("failed to insert record: %w", err)
	}

	if idVal, ok := data["id"]; ok {
		return c.GetRecord(ctx, dbName, table, fmt.Sprintf("%v", idVal))
	} else if res.LastInsertID > 0 {
		return c.GetRecord(ctx, dbName, table, fmt.Sprintf("%d", res.LastInsertID))
	}

	return data, nil
}

func (c *crudUseCase) UpdateRecord(ctx context.Context, dbName, table, id string, data map[string]interface{}) (map[string]interface{}, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("data payload cannot be empty")
	}

	setClauses := make([]string, 0, len(data))
	vals := make([]interface{}, 0, len(data)+2)

	for k, v := range data {
		setClauses = append(setClauses, fmt.Sprintf("%s = ?", quoteIdent(k)))
		vals = append(vals, v)
	}

	vals = append(vals, id, id)

	query := fmt.Sprintf("UPDATE %s SET %s WHERE id = ? OR rowid = ?;",
		quoteIdent(table),
		strings.Join(setClauses, ", "),
	)

	_, err := c.engine.Execute(ctx, dbName, query, vals)
	if err != nil {
		return nil, fmt.Errorf("failed to update record: %w", err)
	}

	return c.GetRecord(ctx, dbName, table, id)
}

func (c *crudUseCase) DeleteRecord(ctx context.Context, dbName, table, id string) error {
	query := fmt.Sprintf("DELETE FROM %s WHERE id = ? OR rowid = ?;", quoteIdent(table))
	res, err := c.engine.Execute(ctx, dbName, query, []interface{}{id, id})
	if err != nil {
		return err
	}

	if res.RowsAffected == 0 {
		return fmt.Errorf("record not found or already deleted")
	}

	return nil
}

func quoteIdent(s string) string {
	return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
}
