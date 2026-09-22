package engine

import (
	"fmt"
	"os"
	"sync"
)

type Manager struct {
	mu     sync.RWMutex
	dataDir string
	dbs    map[string]*Database
}

func NewManager(dataDir string) (*Manager, error) {
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, err
	}
	return &Manager{dataDir: dataDir, dbs: map[string]*Database{}}, nil
}

func (m *Manager) List() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	names := make([]string, 0, len(m.dbs))
	for n := range m.dbs {
		names = append(names, n)
	}
	return names
}

func (m *Manager) Attach(name string, inMemory bool) (*Database, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if db, ok := m.dbs[name]; ok {
		return db, nil
	}
	db, err := Open(m.dataDir, name, inMemory)
	if err != nil {
		return nil, err
	}
	m.dbs[name] = db
	return db, nil
}

func (m *Manager) Get(name string) (*Database, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	db, ok := m.dbs[name]
	return db, ok
}

func (m *Manager) Detach(name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	db, ok := m.dbs[name]
	if !ok {
		return fmt.Errorf("database %q not attached", name)
	}
	delete(m.dbs, name)
	return db.Close()
}

func (m *Manager) Close() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, db := range m.dbs {
		db.Close()
	}
	m.dbs = map[string]*Database{}
}

func (m *Manager) DataDir() string { return m.dataDir }
