package engine

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"
)

type HistoryEntry struct {
	QueryID      string `json:"queryId"`
	Snippet      string `json:"snippet"`
	QueryText    string `json:"queryText,omitempty"`
	StmtType     string `json:"statementType"`
	Status       string `json:"status"`
	DurationMs   float64 `json:"durationMs"`
	RowsAffected int64  `json:"rowsAffected"`
	RowsReturned int    `json:"rowsReturned"`
	ErrorMessage string `json:"errorMessage,omitempty"`
	ExecutedAt   int64  `json:"executedAt"`
	Pinned       bool   `json:"pinned"`
}

type SavedQuery struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Category  string `json:"category"`
	QueryText string `json:"queryText"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

const historySchema = `
CREATE TABLE IF NOT EXISTS _system_query_history (
	query_id TEXT PRIMARY KEY,
	query_text TEXT NOT NULL,
	statement_type TEXT NOT NULL,
	status TEXT NOT NULL,
	duration_ms REAL NOT NULL,
	rows_affected INTEGER NOT NULL DEFAULT 0,
	rows_returned INTEGER NOT NULL DEFAULT 0,
	error_message TEXT NOT NULL DEFAULT '',
	executed_at INTEGER NOT NULL,
	is_pinned INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_history_time ON _system_query_history (executed_at DESC);
CREATE TABLE IF NOT EXISTS _system_saved_queries (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL UNIQUE,
	category TEXT NOT NULL DEFAULT 'General',
	query_text TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);`

const maxHistoryEntries = 500
const maxHistoryTextLen = 100 * 1024

var sensitiveRe = regexp.MustCompile(`(?i)(password|passwd|secret|token|api_key)\s*[:=]\s*'[^']*'`)

func newID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func ClassifyStatement(query string) string {
	q := strings.TrimSpace(query)
	for strings.HasPrefix(q, "--") {
		if i := strings.Index(q, "\n"); i >= 0 {
			q = strings.TrimSpace(q[i+1:])
		} else {
			return "OTHER"
		}
	}
	upper := strings.ToUpper(q)
	for _, kw := range []string{"SELECT", "INSERT", "UPDATE", "DELETE", "PRAGMA", "EXPLAIN", "WITH"} {
		if strings.HasPrefix(upper, kw) {
			return kw
		}
	}
	for _, kw := range []string{"CREATE", "ALTER", "DROP", "REINDEX", "VACUUM"} {
		if strings.HasPrefix(upper, kw) {
			return "DDL"
		}
	}
	return "OTHER"
}

func maskSensitive(query string) string {
	return sensitiveRe.ReplaceAllString(query, "${1}=':redacted:'")
}

func (d *Database) initHistory() error {
	if _, err := d.db.Exec(historySchema); err != nil {
		return err
	}
	d.historyCh = make(chan HistoryEntry, 64)
	d.stopCh = make(chan struct{})
	go d.historyWorker()
	return nil
}

func (d *Database) historyWorker() {
	for {
		select {
		case <-d.stopCh:
			for len(d.historyCh) > 0 {
				d.writeHistory(<-d.historyCh)
			}
			return
		case e := <-d.historyCh:
			d.writeHistory(e)
		}
	}
}

func (d *Database) writeHistory(e HistoryEntry) {
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		_, lastErr = d.db.Exec(
			`INSERT OR IGNORE INTO _system_query_history (query_id, query_text, statement_type, status, duration_ms, rows_affected, rows_returned, error_message, executed_at) VALUES (?,?,?,?,?,?,?,?,?)`,
			e.QueryID, e.QueryText, e.StmtType, e.Status, e.DurationMs, e.RowsAffected, e.RowsReturned, e.ErrorMessage, e.ExecutedAt,
		)
		if lastErr == nil {
			break
		}
		time.Sleep(200 * time.Millisecond)
	}
	if lastErr != nil {
		log.Printf("ERR_HISTORY_WRITE_FAILED: %v", lastErr)
		return
	}
	if _, err := d.db.Exec(
		`DELETE FROM _system_query_history WHERE is_pinned = 0 AND rowid NOT IN (SELECT rowid FROM _system_query_history WHERE is_pinned = 0 ORDER BY executed_at DESC, rowid DESC LIMIT ?)`, maxHistoryEntries,
	); err != nil {
		log.Printf("history prune: %v", err)
	}
}

func (d *Database) RecordQuery(queryText string, result *QueryResult, execErr error) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("history record panic: %v", r)
		}
	}()
	text := maskSensitive(queryText)
	if len(text) > maxHistoryTextLen {
		text = text[:maxHistoryTextLen] + "...[TRUNCATED]"
	}
	e := HistoryEntry{
		QueryID:   newID(),
		QueryText: text,
		StmtType:  ClassifyStatement(queryText),
		Status:    "SUCCESS",
		ExecutedAt: time.Now().UnixMilli(),
	}
	if execErr != nil {
		e.Status = "FAILED"
		e.ErrorMessage = execErr.Error()
	}
	if result != nil {
		e.DurationMs = result.DurationMs
		e.RowsAffected = result.RowsAffected
		e.RowsReturned = len(result.Rows)
	}
	select {
	case d.historyCh <- e:
	default:
		log.Printf("ERR_HISTORY_WRITE_FAILED: queue full")
	}
}

func (d *Database) ListHistory(status, stmtType, q string, limit int) ([]HistoryEntry, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	where := []string{"1=1"}
	args := []any{}
	if status != "" {
		where = append(where, "status = ?")
		args = append(args, status)
	}
	if stmtType != "" {
		where = append(where, "statement_type = ?")
		args = append(args, stmtType)
	}
	if q != "" {
		where = append(where, "query_text LIKE ?")
		args = append(args, q+"%")
	}
	rows, err := d.db.Query(
		fmt.Sprintf(`SELECT query_id, query_text, statement_type, status, duration_ms, rows_affected, rows_returned, error_message, executed_at, is_pinned FROM _system_query_history WHERE %s ORDER BY executed_at DESC, rowid DESC LIMIT ?`, strings.Join(where, " AND ")),
		append(args, limit)...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []HistoryEntry
	for rows.Next() {
		var e HistoryEntry
		var pinned int
		if err := rows.Scan(&e.QueryID, &e.QueryText, &e.StmtType, &e.Status, &e.DurationMs, &e.RowsAffected, &e.RowsReturned, &e.ErrorMessage, &e.ExecutedAt, &pinned); err != nil {
			return nil, err
		}
		e.Pinned = pinned == 1
		e.Snippet = e.QueryText
		if len(e.Snippet) > 200 {
			e.Snippet = e.Snippet[:200] + "…"
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (d *Database) SaveQuery(title, category, queryText string) (*SavedQuery, error) {
	title = strings.TrimSpace(title)
	if len(title) < 1 || len(title) > 120 {
		return nil, fmt.Errorf("ERR_SAVED_QUERY_TITLE_INVALID: Title must be 1-120 characters")
	}
	if category == "" {
		category = "General"
	}
	var count int
	if err := d.db.QueryRow(`SELECT COUNT(*) FROM _system_saved_queries`).Scan(&count); err != nil {
		return nil, err
	}
	if count >= 200 {
		return nil, fmt.Errorf("ERR_SAVED_QUERY_LIMIT: Saved query limit (200) reached for this database")
	}
	now := time.Now().UnixMilli()
	sq := &SavedQuery{ID: newID(), Title: title, Category: category, QueryText: queryText, CreatedAt: now, UpdatedAt: now}
	_, err := d.db.Exec(`INSERT INTO _system_saved_queries (id, title, category, query_text, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
		sq.ID, sq.Title, sq.Category, sq.QueryText, sq.CreatedAt, sq.UpdatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return nil, fmt.Errorf("ERR_SAVED_QUERY_DUPLICATE: A saved query with this title already exists in this database")
		}
		return nil, err
	}
	return sq, nil
}

func (d *Database) ListSaved() ([]SavedQuery, error) {
	rows, err := d.db.Query(`SELECT id, title, category, query_text, created_at, updated_at FROM _system_saved_queries ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SavedQuery
	for rows.Next() {
		var s SavedQuery
		if err := rows.Scan(&s.ID, &s.Title, &s.Category, &s.QueryText, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (d *Database) DeleteSaved(id string) error {
	res, err := d.db.Exec(`DELETE FROM _system_saved_queries WHERE id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("ERR_SAVED_QUERY_NOT_FOUND: Saved query not found")
	}
	return nil
}
