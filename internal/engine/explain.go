package engine

import "fmt"

type ExplainNode struct {
	ID       int    `json:"id"`
	Parent   int    `json:"parent"`
	NotUsed  int    `json:"notUsed"`
	Detail   string `json:"detail"`
}

// Explain implements QE-005: run EXPLAIN QUERY PLAN for the given SQL.
func (d *Database) Explain(sql string) ([]ExplainNode, error) {
	if sql == "" {
		return nil, fmt.Errorf("ERR_EMPTY_QUERY: Cannot explain empty query")
	}
	rows, err := d.db.Query(`EXPLAIN QUERY PLAN ` + sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ExplainNode
	for rows.Next() {
		var n ExplainNode
		if err := rows.Scan(&n.ID, &n.Parent, &n.NotUsed, &n.Detail); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}
