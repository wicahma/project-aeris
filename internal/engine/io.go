package engine

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"strings"
)

// ponytail: sync import/export ≤10MB. Async job ledger (SD-033), chunked
// upload, JSON import, SQL-dump export deferred — add when files routinely
// exceed 10MB or sync request duration becomes UX blocker.

const ImportMaxBytes = 10 << 20

type ImportSpec struct {
	Table             string   `json:"table"`
	Columns           []string `json:"columns"`
	Delimiter         string   `json:"delimiter"` // single char, default ","
	HasHeader         bool     `json:"hasHeader"`
	DuplicateStrategy string   `json:"duplicateStrategy"` // "fail" | "skip" | "overwrite"
}

type ImportResult struct {
	ProcessedRows int64    `json:"processedRows"`
	InsertedRows  int64    `json:"insertedRows"`
	SkippedRows   int64    `json:"skippedRows"`
	FailedRows    int64    `json:"failedRows"`
	Errors        []RowErr `json:"errors,omitempty"`
}

type RowErr struct {
	Row     int64  `json:"row"`
	Message string `json:"message"`
}

func (d *Database) ImportCSV(ctx context.Context, r io.Reader, spec *ImportSpec) (*ImportResult, error) {
	table := spec.Table
	if err := ValidateIdent(table); err != nil {
		return nil, fmt.Errorf("ERR_TABLE_NAME_INVALID: %w", err)
	}
	if ReservedIdent(table) {
		return nil, fmt.Errorf("ERR_TABLE_NAME_RESERVED: Name is reserved by the system catalog")
	}
	if len(spec.Columns) == 0 {
		return nil, fmt.Errorf("ERR_INVALID_INPUT: columns required")
	}
	cols := make([]string, len(spec.Columns))
	for i, c := range spec.Columns {
		if err := ValidateIdent(c); err != nil {
			return nil, fmt.Errorf("ERR_COLUMN_NAME_INVALID: %w", err)
		}
		cols[i] = c
	}
	schema, err := d.Schema()
	if err != nil {
		return nil, err
	}
	var tbl *Table
	for i := range schema {
		if schema[i].Name == table {
			tbl = &schema[i]
			break
		}
	}
	if tbl == nil {
		return nil, fmt.Errorf("ERR_TABLE_NOT_FOUND: Table %q not found", table)
	}
	valid := map[string]bool{}
	for _, c := range tbl.Columns {
		valid[c.Name] = true
	}
	for _, c := range cols {
		if !valid[c] {
			return nil, fmt.Errorf("ERR_INVALID_COLUMN: Unknown column %q", c)
		}
	}

	strategy := spec.DuplicateStrategy
	if strategy == "" {
		strategy = "fail"
	}
	if strategy != "fail" && strategy != "skip" && strategy != "overwrite" {
		return nil, fmt.Errorf("ERR_INVALID_STRATEGY: %q", strategy)
	}

	delim := ','
	if spec.Delimiter != "" {
		delim = []rune(spec.Delimiter)[0]
	}

	cr := csv.NewReader(r)
	cr.Comma = delim
	cr.FieldsPerRecord = -1
	cr.LazyQuotes = true

	res := &ImportResult{}

	if spec.HasHeader {
		if _, err := cr.Read(); err != nil {
			if err == io.EOF {
				return nil, fmt.Errorf("ERR_EMPTY_FILE: no data rows")
			}
			return nil, err
		}
	}

	verb := "INSERT"
	conflict := ""
	switch strategy {
	case "skip":
		verb = "INSERT OR IGNORE"
	case "overwrite":
		pk := pkColumns(tbl)
		if len(pk) == 0 {
			return nil, fmt.Errorf("ERR_NO_PK: overwrite needs a primary key on %q", table)
		}
		var sets []string
		for _, c := range cols {
			if !containsStr(pk, c) {
				sets = append(sets, QuoteIdent(c)+"=excluded."+QuoteIdent(c))
			}
		}
		if len(sets) == 0 {
			verb = "INSERT OR IGNORE"
		} else {
			conflict = " ON CONFLICT(" + quoteIdents(pk) + ") DO UPDATE SET " + strings.Join(sets, ", ")
		}
	}

	placeholders := "(" + strings.TrimSuffix(strings.Repeat("?,", len(cols)), ",") + ")"
	stmtSQL := fmt.Sprintf("%s INTO %s (%s) VALUES %s%s",
		verb, QuoteIdent(table), quoteIdents(cols), placeholders, conflict)

	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	commit := func() error {
		if tx == nil {
			return nil
		}
		if err := tx.Commit(); err != nil {
			tx = nil
			return err
		}
		tx, err = d.db.BeginTx(ctx, nil)
		return err
	}
	defer func() {
		if tx != nil {
			tx.Rollback()
		}
	}()

	rowNum := int64(0)
	batchRows := int64(0)
	const batchSize = 1000
	for {
		rec, err := cr.Read()
		if err == io.EOF {
			break
		}
		rowNum++
		if err != nil {
			res.ProcessedRows++
			res.FailedRows++
			res.Errors = append(res.Errors, RowErr{Row: rowNum, Message: err.Error()})
			continue
		}
		res.ProcessedRows++
		args := make([]any, len(cols))
		for i := range cols {
			if i < len(rec) && rec[i] != "" {
				args[i] = rec[i]
			}
		}
		ires, ierr := tx.ExecContext(ctx, stmtSQL, args...)
		if ierr != nil {
			res.FailedRows++
			res.Errors = append(res.Errors, RowErr{Row: rowNum, Message: ierr.Error()})
			continue
		}
		if strategy == "skip" {
			if aff, _ := ires.RowsAffected(); aff == 0 {
				res.SkippedRows++
			} else {
				res.InsertedRows++
			}
		} else {
			res.InsertedRows++
		}
		batchRows++
		if batchRows >= batchSize {
			if err := commit(); err != nil {
				return res, err
			}
			batchRows = 0
		}
	}
	if err := commit(); err != nil {
		return res, err
	}
	return res, nil
}

func (d *Database) ExportCSV(ctx context.Context, table string, w io.Writer) (int64, error) {
	rows, cols, err := d.openExport(ctx, table)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	cw := csv.NewWriter(w)
	defer cw.Flush()
	if err := cw.Write(cols); err != nil {
		return 0, err
	}
	return streamRows(rows, len(cols), func(rec []string) error { return cw.Write(rec) })
}

func (d *Database) ExportJSON(ctx context.Context, table string, w io.Writer) (int64, error) {
	rows, cols, err := d.openExport(ctx, table)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	if _, err := w.Write([]byte("[")); err != nil {
		return 0, err
	}
	enc := json.NewEncoder(w)
	first := true
	n, err := streamRowsAny(rows, len(cols), func(vals []any) error {
		m := map[string]any{}
		for i, c := range cols {
			m[c] = cellValue(vals[i])
		}
		if !first {
			if _, err := w.Write([]byte(",")); err != nil {
				return err
			}
		}
		first = false
		return enc.Encode(m)
	})
	if _, werr := w.Write([]byte("]")); werr != nil && err == nil {
		err = werr
	}
	return n, err
}

func (d *Database) openExport(ctx context.Context, table string) (rows interface {
	Next() bool
	Scan(...any) error
	Columns() ([]string, error)
	Close() error
	Err() error
}, cols []string, err error,
) {
	if err := ValidateIdent(table); err != nil {
		return nil, nil, fmt.Errorf("ERR_TABLE_NAME_INVALID: %w", err)
	}
	if ReservedIdent(table) {
		return nil, nil, fmt.Errorf("ERR_TABLE_NAME_RESERVED: Name is reserved by the system catalog")
	}
	r, err := d.db.QueryContext(ctx, `SELECT * FROM `+QuoteIdent(table)+` ORDER BY rowid`)
	if err != nil {
		return nil, nil, err
	}
	c, err := r.Columns()
	if err != nil {
		r.Close()
		return nil, nil, err
	}
	return r, c, nil
}

type stringSink func([]string) error
type anySink func([]any) error

func streamRows(rows interface {
	Next() bool
	Scan(...any) error
	Err() error
}, ncols int, sink stringSink,
) (int64, error) {
	vals := make([]any, ncols)
	ptrs := make([]any, ncols)
	for i := range vals {
		ptrs[i] = &vals[i]
	}
	var n int64
	for rows.Next() {
		if err := rows.Scan(ptrs...); err != nil {
			return n, err
		}
		rec := make([]string, ncols)
		for i, v := range vals {
			rec[i] = cellString(v)
		}
		if err := sink(rec); err != nil {
			return n, err
		}
		n++
	}
	return n, rows.Err()
}

func streamRowsAny(rows interface {
	Next() bool
	Scan(...any) error
	Err() error
}, ncols int, sink anySink,
) (int64, error) {
	vals := make([]any, ncols)
	ptrs := make([]any, ncols)
	for i := range vals {
		ptrs[i] = &vals[i]
	}
	var n int64
	for rows.Next() {
		if err := rows.Scan(ptrs...); err != nil {
			return n, err
		}
		snapshot := make([]any, ncols)
		copy(snapshot, vals)
		if err := sink(snapshot); err != nil {
			return n, err
		}
		n++
	}
	return n, rows.Err()
}

func pkColumns(t *Table) []string {
	var out []string
	for _, c := range t.Columns {
		if c.PrimaryKey {
			out = append(out, c.Name)
		}
	}
	return out
}

func quoteIdents(cols []string) string {
	q := make([]string, len(cols))
	for i, c := range cols {
		q[i] = QuoteIdent(c)
	}
	return strings.Join(q, ", ")
}

func containsStr(s []string, v string) bool {
	for _, x := range s {
		if x == v {
			return true
		}
	}
	return false
}

func cellString(v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case []byte:
		return string(x)
	case string:
		return x
	default:
		return fmt.Sprintf("%v", x)
	}
}

func cellValue(v any) any {
	if b, ok := v.([]byte); ok {
		return string(b)
	}
	return v
}
