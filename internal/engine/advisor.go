package engine

import (
	"fmt"
	"strings"
	"time"
)

// ponytail: SD-011 subset — advisor scans query history (same DB) for SELECTs
// touching the table, runs EXPLAIN QUERY PLAN, flags SCAN <table> (full scan)
// and recommends index on columns appearing in WHERE/ORDER BY. Per-index
// scan_count / last_used_at not tracked by sqlite — skip. Rebuild endpoint
// deferred to SD-012 (async).

type AdvisorReport struct {
	Table     string             `json:"table"`
	Queries   int                `json:"queries"`
	Scans     int                `json:"scans"`
	Recommend []AdvisorRecommend `json:"recommend"`
	Generated time.Time          `json:"generated"`
}

type AdvisorRecommend struct {
	Columns []string `json:"columns"`
	Reason  string   `json:"reason"`
}

// IndexAdvisor analyzes query history for full-table-scan patterns.
func (d *Database) IndexAdvisor(table string) (*AdvisorReport, error) {
	if err := ValidateIdent(table); err != nil {
		return nil, fmt.Errorf("ERR_TABLE_NAME_INVALID: %w", err)
	}
	if ReservedIdent(table) {
		return nil, fmt.Errorf("ERR_TABLE_NAME_RESERVED: %q is a system table", table)
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

	// Pull SELECT queries from history mentioning this table.
	rows, err := d.db.Query(
		`SELECT query_text FROM _system_query_history WHERE statement_type = 'SELECT' AND query_text LIKE ? ORDER BY executed_at DESC LIMIT 200`,
		"%"+table+"%",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var stmts []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		stmts = append(stmts, s)
	}

	rep := &AdvisorReport{Table: table, Queries: len(stmts), Generated: time.Now().UTC()}

	// Existing indexes → column set to avoid duplicate recommendations.
	existing := map[string]bool{}
	indexes, _ := d.ListIndexes()
	for _, idx := range indexes {
		if idx.Table == table {
			existing[strings.Join(idx.Columns, ",")] = true
		}
	}

	whereCols := map[string]int{}
	for _, sqlText := range stmts {
		plan, err := d.Explain(sqlText)
		if err != nil {
			continue
		}
		for _, node := range plan {
			if strings.HasPrefix(node.Detail, "SCAN "+strings.ToUpper(table)) ||
				strings.HasPrefix(node.Detail, "SCAN "+table) {
				rep.Scans++
				for _, col := range extractWhereColumns(sqlText, tbl) {
					whereCols[col]++
				}
				break
			}
		}
	}

	// Recommend index on most-frequent WHERE columns not already indexed.
	type cand struct {
		col string
		n   int
	}
	var cands []cand
	for col, n := range whereCols {
		if !existing[col] {
			cands = append(cands, cand{col, n})
		}
	}
	for i := 0; i < len(cands)-1; i++ {
		for j := i + 1; j < len(cands); j++ {
			if cands[j].n > cands[i].n {
				cands[i], cands[j] = cands[j], cands[i]
			}
		}
	}
	for _, c := range cands {
		if len(rep.Recommend) >= 3 {
			break
		}
		rep.Recommend = append(rep.Recommend, AdvisorRecommend{
			Columns: []string{c.col},
			Reason:  fmt.Sprintf("Column %q appears in WHERE of %d full-scan queries", c.col, c.n),
		})
	}
	return rep, nil
}

// extractWhereColumns returns table columns referenced in WHERE/ORDER BY clauses.
// ponytail: naive string match — not a SQL parser. False positives possible on
// column names appearing in string literals. Upgrade path: real SQL parser.
func extractWhereColumns(sqlText string, tbl *Table) []string {
	upper := strings.ToUpper(sqlText)
	whereIdx := strings.Index(upper, " WHERE ")
	orderIdx := strings.Index(upper, " ORDER BY ")
	var clause string
	if whereIdx >= 0 {
		end := len(sqlText)
		for _, kw := range []string{" GROUP BY ", " ORDER BY ", " LIMIT ", ";"} {
			if i := strings.Index(upper[whereIdx:], kw); i >= 0 && whereIdx+i < end {
				end = whereIdx + i
			}
		}
		clause = sqlText[whereIdx:end]
	}
	if orderIdx >= 0 {
		clause += " " + sqlText[orderIdx:]
	}
	var out []string
	for _, c := range tbl.Columns {
		if strings.Contains(clause, c.Name) {
			out = append(out, c.Name)
		}
	}
	return out
}
