package engine

import (
	"container/list"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

// ponytail: in-memory LRU per database (QE-016 subset). ZSTD + persistent
// _system_query_result_cache table deferred — 5min TTL + 50-entry cap covers
// interactive pagination. Upgrade path: swap cacheStore impl to sqlite table
// when multi-process or >5min cache needed.

const (
	cacheMaxEntries = 50
	cacheMaxRows    = 10000
	cacheTTL        = 5 * time.Minute
)

type cacheEntry struct {
	key       string
	result    *QueryResult
	cachedAt  time.Time
	expiresAt time.Time
}

type cacheStore struct {
	mu   sync.Mutex
	ll   *list.List
	byKey map[string]*list.Element
}

func newCacheStore() *cacheStore {
	return &cacheStore{ll: list.New(), byKey: map[string]*list.Element{}}
}

func cacheKey(sql string) string {
	h := sha256.Sum256([]byte(sql))
	return hex.EncodeToString(h[:16])
}

func (c *cacheStore) Get(key string) (*QueryResult, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	el, ok := c.byKey[key]
	if !ok {
		return nil, false
	}
	e := el.Value.(*cacheEntry)
	if time.Now().After(e.expiresAt) {
		c.ll.Remove(el)
		delete(c.byKey, key)
		return nil, false
	}
	c.ll.MoveToFront(el)
	return e.result, true
}

func (c *cacheStore) Set(key string, res *QueryResult) {
	if len(res.Rows) > cacheMaxRows {
		return // too big to cache
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if el, ok := c.byKey[key]; ok {
		c.ll.Remove(el)
	}
	now := time.Now()
	e := &cacheEntry{key: key, result: res, cachedAt: now, expiresAt: now.Add(cacheTTL)}
	el := c.ll.PushFront(e)
	c.byKey[key] = el
	for c.ll.Len() > cacheMaxEntries {
		old := c.ll.Back()
		if old != nil {
			c.ll.Remove(old)
			delete(c.byKey, old.Value.(*cacheEntry).key)
		}
	}
}

func (c *cacheStore) Invalidate() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.ll.Init()
	c.byKey = map[string]*list.Element{}
}

// QueryPaged implements QE-016: cache result on first page fetch, slice on
// subsequent pages. DML/DDL invalidates entire cache (conservative).
func (d *Database) QueryPaged(ctx context.Context, sqlText string, page, pageSize int) (*QueryResult, bool, error) {
	if pageSize <= 0 {
		pageSize = 100
	}
	if pageSize > 1000 {
		pageSize = 1000
	}
	if page <= 0 {
		page = 1
	}

	key := cacheKey(sqlText)
	cached := false
	var res *QueryResult

	if c, ok := d.cache.Get(key); ok {
		res = c
		cached = true
	} else {
		var err error
		res, err = d.QueryCtx(ctx, sqlText)
		if err != nil {
			return nil, false, err
		}
		if len(res.Columns) > 0 {
			d.cache.Set(key, res)
		}
	}

	if len(res.Columns) == 0 {
		return res, cached, nil // DML result — no pagination
	}

	start := (page - 1) * pageSize
	end := start + pageSize
	if start > len(res.Rows) {
		start = len(res.Rows)
	}
	if end > len(res.Rows) {
		end = len(res.Rows)
	}
	out := &QueryResult{
		Columns:      res.Columns,
		Rows:         res.Rows[start:end],
		RowsAffected: res.RowsAffected,
		DurationMs:   res.DurationMs,
	}
	return out, cached, nil
}

// InvalidateCache clears the query result cache. Called on DML/DDL.
func (d *Database) InvalidateCache() {
	d.cache.Invalidate()
}

// QueryCtx records invalidation on DML/DDL.
func (d *Database) invalidateOnWrite(sqlText string) {
	if !isReadQuery(sqlText) {
		d.InvalidateCache()
	}
}

var _ = fmt.Sprintf // keep fmt import if unused after cleanup
