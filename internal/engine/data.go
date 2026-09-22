package engine

import (
	"database/sql"
	"fmt"
	"strconv"
	"strings"
)

type DataFilter struct {
	Column string
	Op     string
	Value  string
}

type DataSort struct {
	Column string
	Desc   bool
}

type TableDataRequest struct {
	Page     int
	PageSize int
	Sort     []DataSort
	Filters  []DataFilter
}

type TableDataResponse struct {
	Columns   []Column `json:"columns"`
	Rows      [][]any  `json:"rows"`
	RowIDs    []int64  `json:"rowIds"`
	TotalRows int64    `json:"totalRows"`
	Page      int      `json:"page"`
	PageSize  int      `json:"pageSize"`
}

var filterOps = map[string]string{"eq": "=", "ne": "!=", "gt": ">", "lt": "<", "contains": "LIKE"}

func (r *DataFilter) validate(cols []Column) error {
	if _, ok := filterOps[r.Op]; !ok {
		return fmt.Errorf("ERR_INVALID_FILTER_OP: %q", r.Op)
	}
	for _, c := range cols {
		if c.Name == r.Column {
			return nil
		}
	}
	return fmt.Errorf("ERR_INVALID_COLUMN: Unknown column %q", r.Column)
}

// Browse implements SD-020 (ponytail scope): server-side paginated read with
// bound filter values and whitelisted sort columns.
func (d *Database) Browse(table string, req TableDataRequest) (*TableDataResponse, error) {
	if err := ValidateIdent(table); err != nil {
		return nil, fmt.Errorf("ERR_TABLE_NAME_INVALID: %w", err)
	}
	cols, err := d.columns(table)
	if err != nil {
		return nil, err
	}
	if len(cols) == 0 {
		return nil, fmt.Errorf("ERR_TABLE_NOT_FOUND: Table %q not found", table)
	}
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 || req.PageSize > 500 {
		req.PageSize = 50
	}

	where, args, err := buildWhere(req.Filters, cols)
	if err != nil {
		return nil, err
	}
	order, err := buildOrder(req.Sort, cols)
	if err != nil {
		return nil, err
	}

	var total int64
	if err := d.db.QueryRow(`SELECT COUNT(*) FROM ` + QuoteIdent(table) + where, args...).Scan(&total); err != nil {
		return nil, err
	}

	pageCount := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))
	if pageCount == 0 {
		pageCount = 1
	}
	if req.Page > pageCount {
		req.Page = pageCount
	}

	colNames := make([]string, len(cols))
	for i, c := range cols {
		colNames[i] = QuoteIdent(c.Name)
	}
	q := `SELECT rowid, ` + strings.Join(colNames, ", ") + ` FROM ` + QuoteIdent(table) + where + order +
		` LIMIT ` + strconv.Itoa(req.PageSize) + ` OFFSET ` + strconv.Itoa((req.Page-1)*req.PageSize)

	rows, err := d.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := &TableDataResponse{Columns: cols, Page: req.Page, PageSize: req.PageSize, TotalRows: total}
	for rows.Next() {
		vals := make([]any, len(cols)+1)
		ptrs := make([]any, len(cols)+1)
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		var rid int64
		switch v := vals[0].(type) {
		case int64:
			rid = v
		default:
			rid = 0
		}
		row := make([]any, len(cols))
		for i := 1; i <= len(cols); i++ {
			if b, ok := vals[i].([]byte); ok {
				row[i-1] = string(b)
			} else {
				row[i-1] = vals[i]
			}
		}
		out.RowIDs = append(out.RowIDs, rid)
		out.Rows = append(out.Rows, row)
	}
	return out, rows.Err()
}

func buildWhere(filters []DataFilter, cols []Column) (string, []any, error) {
	if len(filters) == 0 {
		return "", nil, nil
	}
	parts := make([]string, 0, len(filters))
	args := make([]any, 0, len(filters))
	for _, f := range filters {
		if err := f.validate(cols); err != nil {
			return "", nil, err
		}
		op := filterOps[f.Op]
		val := f.Value
		if f.Op == "contains" {
			val = "%" + val + "%"
		}
		parts = append(parts, QuoteIdent(f.Column)+" "+op+" ?")
		args = append(args, val)
	}
	return " WHERE " + strings.Join(parts, " AND "), args, nil
}

func buildOrder(sorts []DataSort, cols []Column) (string, error) {
	if len(sorts) == 0 {
		return "", nil
	}
	parts := make([]string, 0, len(sorts))
	for _, s := range sorts {
		found := false
		for _, c := range cols {
			if c.Name == s.Column {
				found = true
				break
			}
		}
		if !found {
			return "", fmt.Errorf("ERR_INVALID_COLUMN: Unknown column %q", s.Column)
		}
		dir := "ASC"
		if s.Desc {
			dir = "DESC"
		}
		parts = append(parts, QuoteIdent(s.Column)+" "+dir)
	}
	return " ORDER BY " + strings.Join(parts, ", "), nil
}

type BatchOp struct {
	Op     string         `json:"op"` // insert | update | delete
	RowID  int64          `json:"rowId,omitempty"`
	Values map[string]any `json:"values,omitempty"`
}

type RowError struct {
	RowID   int64  `json:"rowId,omitempty"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

type BatchResult struct {
	Applied int64       `json:"applied"`
	Errors  []RowError  `json:"errors,omitempty"`
}

// Batch implements SD-021/SD-022 (ponytail scope): atomic insert/update/delete.
// Update/delete address rows by rowid; insert supplies values only.
// Whole batch in one transaction — any failure rolls back everything.
func (d *Database) Batch(table string, ops []BatchOp) (*BatchResult, error) {
	if err := ValidateIdent(table); err != nil {
		return nil, fmt.Errorf("ERR_TABLE_NAME_INVALID: %w", err)
	}
	cols, err := d.columns(table)
	if err != nil {
		return nil, err
	}
	if len(cols) == 0 {
		return nil, fmt.Errorf("ERR_TABLE_NOT_FOUND: Table %q not found", table)
	}
	byName := map[string]Column{}
	for _, c := range cols {
		byName[strings.ToLower(c.Name)] = c
	}

	tx, err := d.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	res := &BatchResult{}
	for _, op := range ops {
		var execErr error
		switch op.Op {
		case "insert":
			execErr = batchInsert(tx, table, byName, op.Values)
		case "update":
			execErr = batchUpdate(tx, table, byName, op.RowID, op.Values)
		case "delete":
			_, execErr = tx.Exec(`DELETE FROM `+QuoteIdent(table)+` WHERE rowid = ?`, op.RowID)
		default:
			execErr = fmt.Errorf("ERR_INVALID_OP: %q", op.Op)
		}
		if execErr != nil {
			return nil, fmt.Errorf("%w (rowId %d)", execErr, op.RowID)
		}
		res.Applied++
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return res, nil
}

func coerce(col Column, v any) (any, error) {
	if v == nil {
		return nil, nil
	}
	switch col.Type {
	case "INTEGER":
		switch n := v.(type) {
		case float64:
			return int64(n), nil
		case string:
			i, err := strconv.ParseInt(n, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("ERR_TYPE_MISMATCH: %q is not a valid INTEGER", n)
			}
			return i, nil
		}
	case "REAL":
		switch n := v.(type) {
		case float64:
			return n, nil
		case string:
			f, err := strconv.ParseFloat(n, 64)
			if err != nil {
				return nil, fmt.Errorf("ERR_TYPE_MISMATCH: %q is not a valid REAL", n)
			}
			return f, nil
		}
	case "TEXT", "BLOB":
		switch n := v.(type) {
		case string:
			return n, nil
		default:
			return fmt.Sprintf("%v", n), nil
		}
	}
	return v, nil
}

func batchInsert(tx *sql.Tx, table string, byName map[string]Column, values map[string]any) error {
	if len(values) == 0 {
		return fmt.Errorf("ERR_BATCH_EMPTY: insert requires values")
	}
	names := make([]string, 0, len(values))
	placeholders := make([]string, 0, len(values))
	args := make([]any, 0, len(values))
	for k, v := range values {
		col, ok := byName[strings.ToLower(k)]
		if !ok {
			return fmt.Errorf("ERR_INVALID_COLUMN: Unknown column %q", k)
		}
		cv, err := coerce(col, v)
		if err != nil {
			return err
		}
		names = append(names, QuoteIdent(col.Name))
		placeholders = append(placeholders, "?")
		args = append(args, cv)
	}
	q := `INSERT INTO ` + QuoteIdent(table) + ` (` + strings.Join(names, ", ") + `) VALUES (` + strings.Join(placeholders, ", ") + `)`
	_, err := tx.Exec(q, args...)
	return err
}

func batchUpdate(tx *sql.Tx, table string, byName map[string]Column, rowID int64, values map[string]any) error {
	if rowID <= 0 {
		return fmt.Errorf("ERR_PK_REQUIRED: update requires rowId")
	}
	if len(values) == 0 {
		return fmt.Errorf("ERR_BATCH_EMPTY: update requires values")
	}
	sets := make([]string, 0, len(values))
	args := make([]any, 0, len(values)+1)
	for k, v := range values {
		col, ok := byName[strings.ToLower(k)]
		if !ok {
			return fmt.Errorf("ERR_INVALID_COLUMN: Unknown column %q", k)
		}
		cv, err := coerce(col, v)
		if err != nil {
			return err
		}
		sets = append(sets, QuoteIdent(col.Name)+" = ?")
		args = append(args, cv)
	}
	args = append(args, rowID)
	q := `UPDATE ` + QuoteIdent(table) + ` SET ` + strings.Join(sets, ", ") + ` WHERE rowid = ?`
	r, err := tx.Exec(q, args...)
	if err != nil {
		return err
	}
	n, _ := r.RowsAffected()
	if n == 0 {
		return fmt.Errorf("ERR_ROW_NOT_FOUND: rowId %d no longer exists", rowID)
	}
	return nil
}
