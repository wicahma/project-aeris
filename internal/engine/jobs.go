package engine

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// ponytail: in-memory job registry (process-lifetime only). Persistent job
// ledger, SSE progress, retry/cleanup actions deferred — add when jobs
// routinely exceed process lifetime or multi-user concurrency arrives.

var jobSeq atomic.Int64

type JobStatus string

const (
	JobRunning JobStatus = "RUNNING"
	JobDone    JobStatus = "DONE"
	JobFailed  JobStatus = "FAILED"
)

type Job struct {
	ID        int64         `json:"id"`
	Kind      string        `json:"kind"` // "import_csv"
	Table     string        `json:"table"`
	Status    JobStatus     `json:"status"`
	Result    *ImportResult `json:"result,omitempty"`
	Error     string        `json:"error,omitempty"`
	StartedAt string        `json:"startedAt"`
	EndedAt   string        `json:"endedAt,omitempty"`
}

type JobRunner struct {
	mu   sync.Mutex
	jobs map[int64]*Job
}

func NewJobRunner() *JobRunner {
	return &JobRunner{jobs: map[int64]*Job{}}
}

func (r *JobRunner) List() []*Job {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]*Job, 0, len(r.jobs))
	for _, j := range r.jobs {
		out = append(out, j)
	}
	return out
}

func (r *JobRunner) Get(id int64) *Job {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.jobs[id]
}

func (r *JobRunner) StartImport(d *Database, table string, body string, spec *ImportSpec) *Job {
	id := jobSeq.Add(1)
	job := &Job{
		ID:        id,
		Kind:      "import_csv",
		Table:     table,
		Status:    JobRunning,
		StartedAt: time.Now().UTC().Format(time.RFC3339),
	}
	r.mu.Lock()
	r.jobs[id] = job
	r.mu.Unlock()

	go func() {
		ctx := context.Background()
		res, err := d.ImportCSV(ctx, strings.NewReader(body), spec)
		r.mu.Lock()
		defer r.mu.Unlock()
		job.EndedAt = time.Now().UTC().Format(time.RFC3339)
		if err != nil {
			job.Status = JobFailed
			job.Error = err.Error()
		} else {
			job.Status = JobDone
			job.Result = res
		}
	}()

	return job
}

func (j *Job) String() string {
	return fmt.Sprintf("job %d: %s %s (%s)", j.ID, j.Kind, j.Table, j.Status)
}
