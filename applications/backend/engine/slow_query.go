package engine

import (
	"log"
	"sync"
	"time"

	"project-aeris/backend/domain"
)

type SlowQueryHandler func(history *domain.QueryHistory)

type SlowQueryLogger struct {
	thresholdMs int64
	handlers    []SlowQueryHandler
	mu          sync.RWMutex
}

func NewSlowQueryLogger(thresholdMs int64) *SlowQueryLogger {
	if thresholdMs <= 0 {
		thresholdMs = 100 // default 100ms
	}
	return &SlowQueryLogger{
		thresholdMs: thresholdMs,
		handlers:    make([]SlowQueryHandler, 0),
	}
}

func (l *SlowQueryLogger) OnSlowQuery(handler SlowQueryHandler) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.handlers = append(l.handlers, handler)
}

func (l *SlowQueryLogger) LogQuery(dbName, query string, durationMs int64, err error, user string) *domain.QueryHistory {
	status := "success"
	errMsg := ""
	if err != nil {
		status = "error"
		errMsg = err.Error()
	}

	history := &domain.QueryHistory{
		DatabaseName:    dbName,
		Query:           query,
		ExecutionTimeMs: durationMs,
		Status:          status,
		ErrorMessage:    errMsg,
		ExecutedBy:      user,
		ExecutedAt:      time.Now(),
	}

	if durationMs >= l.thresholdMs {
		log.Printf("[SLOW QUERY] [%s] [%dms] user=%s query=%s", dbName, durationMs, user, query)
		l.mu.RLock()
		handlers := make([]SlowQueryHandler, len(l.handlers))
		copy(handlers, l.handlers)
		l.mu.RUnlock()

		for _, h := range handlers {
			go h(history)
		}
	}

	return history
}

func (l *SlowQueryLogger) GetThreshold() int64 {
	return l.thresholdMs
}

func (l *SlowQueryLogger) SetThreshold(thresholdMs int64) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.thresholdMs = thresholdMs
}
