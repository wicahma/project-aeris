package engine

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	_ "modernc.org/sqlite"
	"project-aeris/backend/domain"
)

type SQLiteManager struct {
	dataDir     string
	mu          sync.RWMutex
	connections map[string]*sql.DB
	dbInfos     map[string]*domain.DatabaseInfo
}

func NewSQLiteManager(dataDir string) (*SQLiteManager, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	mgr := &SQLiteManager{
		dataDir:     dataDir,
		connections: make(map[string]*sql.DB),
		dbInfos:     make(map[string]*domain.DatabaseInfo),
	}

	return mgr, nil
}

func (m *SQLiteManager) GetConnection(name string) (*sql.DB, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if db, ok := m.connections[name]; ok {
		return db, nil
	}

	info, ok := m.dbInfos[name]
	var dsn string
	if ok && info.IsInMemory {
		dsn = fmt.Sprintf("file:%s?mode=memory&cache=shared", name)
	} else {
		dbPath := filepath.Join(m.dataDir, name+".db")
		dsn = dbPath
	}

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database %s: %w", name, err)
	}

	// Configure pragmas for WAL mode, busy timeout, foreign keys
	pragmas := []string{
		"PRAGMA journal_mode=WAL;",
		"PRAGMA busy_timeout=5000;",
		"PRAGMA foreign_keys=ON;",
	}
	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			// Memory DB may not support all pragmas, ignore soft errors
		}
	}

	m.connections[name] = db
	if !ok {
		dbPath := filepath.Join(m.dataDir, name+".db")
		var size int64
		if fi, err := os.Stat(dbPath); err == nil {
			size = fi.Size()
		}
		m.dbInfos[name] = &domain.DatabaseInfo{
			Name:       name,
			FilePath:   dbPath,
			SizeBytes:  size,
			IsInMemory: false,
			CreatedAt:  time.Now(),
			Status:     "online",
		}
	}

	return db, nil
}

func (m *SQLiteManager) CreateDatabase(name string, inMemory bool) (*domain.DatabaseInfo, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.dbInfos[name]; ok {
		return nil, fmt.Errorf("database %s already exists", name)
	}

	var dsn string
	var dbPath string
	if inMemory {
		dsn = fmt.Sprintf("file:%s?mode=memory&cache=shared", name)
		dbPath = ":memory:"
	} else {
		dbPath = filepath.Join(m.dataDir, name+".db")
		dsn = dbPath
	}

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to create database %s: %w", name, err)
	}

	pragmas := []string{
		"PRAGMA journal_mode=WAL;",
		"PRAGMA busy_timeout=5000;",
		"PRAGMA foreign_keys=ON;",
	}
	for _, p := range pragmas {
		db.Exec(p)
	}

	info := &domain.DatabaseInfo{
		Name:       name,
		FilePath:   dbPath,
		SizeBytes:  0,
		IsInMemory: inMemory,
		CreatedAt:  time.Now(),
		Status:     "online",
	}

	m.connections[name] = db
	m.dbInfos[name] = info

	return info, nil
}

func (m *SQLiteManager) DeleteDatabase(name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if db, ok := m.connections[name]; ok {
		db.Close()
		delete(m.connections, name)
	}

	info, ok := m.dbInfos[name]
	if ok && !info.IsInMemory {
		dbPath := filepath.Join(m.dataDir, name+".db")
		os.Remove(dbPath)
		os.Remove(dbPath + "-wal")
		os.Remove(dbPath + "-shm")
	}

	delete(m.dbInfos, name)
	return nil
}

func (m *SQLiteManager) ListDatabases() ([]*domain.DatabaseInfo, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Scan data directory for any .db files not yet loaded
	files, _ := os.ReadDir(m.dataDir)
	for _, f := range files {
		if !f.IsDir() && filepath.Ext(f.Name()) == ".db" {
			name := f.Name()[:len(f.Name())-3]
			if name == "_system" {
				continue
			}
			if _, ok := m.dbInfos[name]; !ok {
				infoPath := filepath.Join(m.dataDir, f.Name())
				var size int64
				if fi, err := f.Info(); err == nil {
					size = fi.Size()
				}
				m.dbInfos[name] = &domain.DatabaseInfo{
					Name:       name,
					FilePath:   infoPath,
					SizeBytes:  size,
					IsInMemory: false,
					CreatedAt:  time.Now(),
					Status:     "online",
				}
			}
		}
	}

	result := make([]*domain.DatabaseInfo, 0, len(m.dbInfos))
	for _, info := range m.dbInfos {
		if info.Name == "_system" {
			continue
		}
		// Update size if file exists
		if !info.IsInMemory {
			if fi, err := os.Stat(info.FilePath); err == nil {
				info.SizeBytes = fi.Size()
			}
		}
		result = append(result, info)
	}

	return result, nil
}

func (m *SQLiteManager) GetDatabaseInfo(name string) (*domain.DatabaseInfo, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	info, ok := m.dbInfos[name]
	if !ok {
		// Try checking file system
		dbPath := filepath.Join(m.dataDir, name+".db")
		if fi, err := os.Stat(dbPath); err == nil {
			info = &domain.DatabaseInfo{
				Name:       name,
				FilePath:   dbPath,
				SizeBytes:  fi.Size(),
				IsInMemory: false,
				CreatedAt:  fi.ModTime(),
				Status:     "online",
			}
			return info, nil
		}
		return nil, fmt.Errorf("database %s not found", name)
	}

	if !info.IsInMemory {
		if fi, err := os.Stat(info.FilePath); err == nil {
			info.SizeBytes = fi.Size()
		}
	}
	return info, nil
}

func (m *SQLiteManager) CloseAll() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for name, db := range m.connections {
		db.Close()
		delete(m.connections, name)
	}
	return nil
}
