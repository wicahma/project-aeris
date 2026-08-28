package engine

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"project-aeris/backend/domain"
)

type SQLExecutor struct {
	dbMgr      domain.DatabaseManager
	slowLogger *SlowQueryLogger
}

func NewSQLExecutor(dbMgr domain.DatabaseManager, slowLogger *SlowQueryLogger) *SQLExecutor {
	return &SQLExecutor{
		dbMgr:      dbMgr,
		slowLogger: slowLogger,
	}
}

func (e *SQLExecutor) Execute(ctx context.Context, dbName string, sqlQuery string, params []interface{}) (*domain.QueryResult, error) {
	db, err := e.dbMgr.GetConnection(dbName)
	if err != nil {
		return nil, fmt.Errorf("failed to get db connection for %s: %w", dbName, err)
	}

	start := time.Now()
	trimmed := strings.TrimSpace(sqlQuery)
	upper := strings.ToUpper(trimmed)

	isSelect := strings.HasPrefix(upper, "SELECT") || strings.HasPrefix(upper, "PRAGMA") || strings.HasPrefix(upper, "EXPLAIN") || strings.HasPrefix(upper, "WITH")

	if isSelect {
		rows, err := db.QueryContext(ctx, sqlQuery, params...)
		duration := time.Since(start).Milliseconds()

		user := ctx.Value("username")
		userStr := "system"
		if u, ok := user.(string); ok && u != "" {
			userStr = u
		}
		e.slowLogger.LogQuery(dbName, sqlQuery, duration, err, userStr)

		if err != nil {
			return nil, fmt.Errorf("query execution failed: %w", err)
		}
		defer rows.Close()

		cols, err := rows.Columns()
		if err != nil {
			return nil, fmt.Errorf("failed to get columns: %w", err)
		}

		colTypes, err := rows.ColumnTypes()
		colTypeNames := make([]string, len(cols))
		if err == nil {
			for i, ct := range colTypes {
				colTypeNames[i] = ct.DatabaseTypeName()
			}
		}

		resultRows := make([][]interface{}, 0)
		for rows.Next() {
			columnPointers := make([]interface{}, len(cols))
			for i := range cols {
				var v interface{}
				columnPointers[i] = &v
			}

			if err := rows.Scan(columnPointers...); err != nil {
				return nil, fmt.Errorf("failed to scan row: %w", err)
			}

			rowVals := make([]interface{}, len(cols))
			for i := range cols {
				val := *(columnPointers[i].(*interface{}))
				if b, ok := val.([]byte); ok {
					rowVals[i] = string(b)
				} else {
					rowVals[i] = val
				}
			}
			resultRows = append(resultRows, rowVals)
		}

		return &domain.QueryResult{
			Columns:         cols,
			ColumnTypes:     colTypeNames,
			Rows:            resultRows,
			ExecutionTimeMs: duration,
			Query:           sqlQuery,
		}, nil
	}

	// Exec non-select (INSERT, UPDATE, DELETE, CREATE, DROP, etc.)
	res, err := db.ExecContext(ctx, sqlQuery, params...)
	duration := time.Since(start).Milliseconds()

	user := ctx.Value("username")
	userStr := "system"
	if u, ok := user.(string); ok && u != "" {
		userStr = u
	}
	e.slowLogger.LogQuery(dbName, sqlQuery, duration, err, userStr)

	if err != nil {
		return nil, fmt.Errorf("execution failed: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()
	lastInsertID, _ := res.LastInsertId()

	return &domain.QueryResult{
		Columns:         []string{},
		ColumnTypes:     []string{},
		Rows:            [][]interface{}{},
		RowsAffected:    rowsAffected,
		LastInsertID:    lastInsertID,
		ExecutionTimeMs: duration,
		Query:           sqlQuery,
	}, nil
}

func (e *SQLExecutor) Explain(ctx context.Context, dbName string, sqlQuery string) (*domain.QueryResult, error) {
	explainQuery := "EXPLAIN QUERY PLAN " + sqlQuery
	return e.Execute(ctx, dbName, explainQuery, nil)
}

func (e *SQLExecutor) GetTables(ctx context.Context, dbName string) ([]string, error) {
	db, err := e.dbMgr.GetConnection(dbName)
	if err != nil {
		return nil, err
	}

	query := "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_system_%' ORDER BY name;"
	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list tables: %w", err)
	}
	defer rows.Close()

	tables := make([]string, 0)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		tables = append(tables, name)
	}
	return tables, nil
}

func (e *SQLExecutor) GetTableSchema(ctx context.Context, dbName, tableName string) (*domain.TableSchema, error) {
	db, err := e.dbMgr.GetConnection(dbName)
	if err != nil {
		return nil, err
	}

	// 1. Column info via PRAGMA table_info(tableName)
	colQuery := fmt.Sprintf("PRAGMA table_info(%s);", quoteIdentifier(tableName))
	rows, err := db.QueryContext(ctx, colQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to get table info: %w", err)
	}
	defer rows.Close()

	cols := make([]domain.ColumnInfo, 0)
	for rows.Next() {
		var cid int
		var name, colType string
		var notNull, pk int
		var dfltValue sql.NullString

		if err := rows.Scan(&cid, &name, &colType, &notNull, &dfltValue, &pk); err != nil {
			return nil, err
		}

		var dflt *string
		if dfltValue.Valid {
			dflt = &dfltValue.String
		}

		cols = append(cols, domain.ColumnInfo{
			Name:         name,
			Type:         colType,
			Nullable:     notNull == 0,
			PrimaryKey:   pk > 0,
			DefaultValue: dflt,
		})
	}
	rows.Close()

	// 2. Indexes via PRAGMA index_list(tableName)
	idxListQuery := fmt.Sprintf("PRAGMA index_list(%s);", quoteIdentifier(tableName))
	idxRows, err := db.QueryContext(ctx, idxListQuery)
	indexes := make([]domain.IndexInfo, 0)
	if err == nil {
		defer idxRows.Close()
		for idxRows.Next() {
			var seq int
			var idxName string
			var unique int
			var origin, partial string
			if err := idxRows.Scan(&seq, &idxName, &unique, &origin, &partial); err == nil {
				// Fetch index columns
				idxColsQuery := fmt.Sprintf("PRAGMA index_info(%s);", quoteIdentifier(idxName))
				idxColRows, err2 := db.QueryContext(ctx, idxColsQuery)
				idxCols := make([]string, 0)
				if err2 == nil {
					for idxColRows.Next() {
						var seqno, cid int
						var colName string
						if err := idxColRows.Scan(&seqno, &cid, &colName); err == nil {
							idxCols = append(idxCols, colName)
						}
					}
					idxColRows.Close()
				}
				indexes = append(indexes, domain.IndexInfo{
					Name:    idxName,
					Columns: idxCols,
					Unique:  unique == 1,
				})
			}
		}
	}

	// 3. Foreign Keys via PRAGMA foreign_key_list(tableName)
	fkQuery := fmt.Sprintf("PRAGMA foreign_key_list(%s);", quoteIdentifier(tableName))
	fkRows, err := db.QueryContext(ctx, fkQuery)
	foreignKeys := make([]domain.ForeignKeyInfo, 0)
	if err == nil {
		defer fkRows.Close()
		for fkRows.Next() {
			var id, seq int
			var table, from, to, onUpdate, onDelete, match string
			if err := fkRows.Scan(&id, &seq, &table, &from, &to, &onUpdate, &onDelete, &match); err == nil {
				foreignKeys = append(foreignKeys, domain.ForeignKeyInfo{
					ConstraintName: fmt.Sprintf("fk_%s_%s", tableName, from),
					Column:         from,
					ForeignTable:   table,
					ForeignColumn:  to,
				})
			}
		}
	}

	// 4. Row count
	var rowCount int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s;", quoteIdentifier(tableName))
	_ = db.QueryRowContext(ctx, countQuery).Scan(&rowCount)

	return &domain.TableSchema{
		Name:        tableName,
		Columns:     cols,
		Indexes:     indexes,
		ForeignKeys: foreignKeys,
		RowCount:    rowCount,
	}, nil
}

func (e *SQLExecutor) RunMigration(ctx context.Context, dbName, migrationSQL string) error {
	db, err := e.dbMgr.GetConnection(dbName)
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, migrationSQL); err != nil {
		return fmt.Errorf("migration execution failed: %w", err)
	}

	return tx.Commit()
}

func quoteIdentifier(s string) string {
	return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
}
