package domain

import (
	"context"
	"time"
)

type HealthStatus struct {
	Status           string `json:"status"` // "ok", "degraded"
	UptimeSeconds    int64  `json:"uptime_seconds"`
	DatabaseCount    int    `json:"database_count"`
	TotalQueries     int64  `json:"total_queries"`
	SlowQueries      int64  `json:"slow_queries"`
	StorageUsedBytes int64  `json:"storage_used_bytes"`
	ActiveConnections int   `json:"active_connections"`
}

type MonitorEvent struct {
	Type      string      `json:"type"` // "query", "slow_query", "db_change", "health"
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

type MonitorUseCase interface {
	GetHealth(ctx context.Context) (*HealthStatus, error)
	SubscribeEvents(ctx context.Context) (<-chan *MonitorEvent, func())
	BroadcastEvent(event *MonitorEvent)
}
