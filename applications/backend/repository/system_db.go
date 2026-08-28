package repository

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
	"project-aeris/backend/domain"
	"golang.org/x/crypto/bcrypt"
)

type SystemDB struct {
	db *sql.DB
}

func NewSystemDB(dbMgr domain.DatabaseManager) (*SystemDB, error) {
	db, err := dbMgr.GetConnection("_system")
	if err != nil {
		return nil, fmt.Errorf("failed to open system db: %w", err)
	}

	sysDB := &SystemDB{db: db}
	if err := sysDB.initTables(); err != nil {
		return nil, fmt.Errorf("failed to initialize system tables: %w", err)
	}

	if err := sysDB.seedDefaultAdmin(); err != nil {
		return nil, fmt.Errorf("failed to seed default admin: %w", err)
	}

	return sysDB, nil
}

func (s *SystemDB) GetDB() *sql.DB {
	return s.db
}

func (s *SystemDB) initTables() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS _system_users (
			id TEXT PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS _system_query_history (
			id TEXT PRIMARY KEY,
			database_name TEXT NOT NULL,
			query TEXT NOT NULL,
			duration_ms INTEGER NOT NULL,
			status TEXT NOT NULL,
			error_message TEXT,
			executed_by TEXT NOT NULL,
			executed_at DATETIME NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS _system_saved_queries (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT,
			query TEXT NOT NULL,
			database_name TEXT,
			created_by TEXT NOT NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS _system_webhooks (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			url TEXT NOT NULL,
			secret TEXT,
			events TEXT NOT NULL,
			active INTEGER NOT NULL DEFAULT 1,
			created_at DATETIME NOT NULL
		);`,
	}

	for _, q := range queries {
		if _, err := s.db.Exec(q); err != nil {
			return fmt.Errorf("error executing init query (%s): %w", q, err)
		}
	}

	return nil
}

func (s *SystemDB) seedDefaultAdmin() error {
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM _system_users").Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		hashed, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		_, err = s.db.Exec(`
			INSERT INTO _system_users (id, username, password_hash, role, created_at, updated_at)
			VALUES ('usr_admin', 'admin', ?, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
		`, string(hashed))
		if err != nil {
			return err
		}
	}

	return nil
}
