package usecase

import (
	"context"
	"os"
	"path/filepath"
	"sync"
	"time"

	"project-aeris/backend/domain"
)

type monitorUseCase struct {
	dbMgr       domain.DatabaseManager
	queryRepo   domain.QueryRepository
	slowLogger  interface{ GetThreshold() int64 }
	startTime   time.Time
	subscribers map[chan *domain.MonitorEvent]bool
	subMu       sync.RWMutex
}

func NewMonitorUseCase(
	dbMgr domain.DatabaseManager,
	queryRepo domain.QueryRepository,
	slowLogger interface{ GetThreshold() int64 },
) domain.MonitorUseCase {
	return &monitorUseCase{
		dbMgr:       dbMgr,
		queryRepo:   queryRepo,
		slowLogger:  slowLogger,
		startTime:   time.Now(),
		subscribers: make(map[chan *domain.MonitorEvent]bool),
	}
}

func (m *monitorUseCase) GetHealth(ctx context.Context) (*domain.HealthStatus, error) {
	dbs, err := m.dbMgr.ListDatabases()
	dbCount := 0
	var storageUsed int64
	if err == nil {
		dbCount = len(dbs)
		for _, db := range dbs {
			storageUsed += db.SizeBytes
		}
	}

	totalQueries, _ := m.queryRepo.GetTotalQueriesCount(ctx)
	slowQueries, _ := m.queryRepo.GetSlowQueriesCount(ctx, m.slowLogger.GetThreshold())

	m.subMu.RLock()
	activeConn := len(m.subscribers)
	m.subMu.RUnlock()

	return &domain.HealthStatus{
		Status:            "ok",
		UptimeSeconds:     int64(time.Since(m.startTime).Seconds()),
		DatabaseCount:     dbCount,
		TotalQueries:      totalQueries,
		SlowQueries:       slowQueries,
		StorageUsedBytes:  storageUsed,
		ActiveConnections: activeConn,
	}, nil
}

func (m *monitorUseCase) SubscribeEvents(ctx context.Context) (<-chan *domain.MonitorEvent, func()) {
	ch := make(chan *domain.MonitorEvent, 100)

	m.subMu.Lock()
	m.subscribers[ch] = true
	m.subMu.Unlock()

	unsubscribe := func() {
		m.subMu.Lock()
		if _, ok := m.subscribers[ch]; ok {
			delete(m.subscribers, ch)
			close(ch)
		}
		m.subMu.Unlock()
	}

	return ch, unsubscribe
}

func (m *monitorUseCase) BroadcastEvent(event *domain.MonitorEvent) {
	m.subMu.RLock()
	defer m.subMu.RUnlock()

	for ch := range m.subscribers {
		select {
		case ch <- event:
		default:
			// Buffer full, skip event for slow consumer
		}
	}
}

func getDirSize(path string) int64 {
	var size int64
	_ = filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() {
			size += info.Size()
		}
		return nil
	})
	return size
}
