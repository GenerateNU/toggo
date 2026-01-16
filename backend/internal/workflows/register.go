package workflows

import (
	"context"
	"log"
	"toggo/internal/config"
	"toggo/internal/repository"
	"toggo/internal/workflows/example"

	"go.temporal.io/sdk/worker"
)

type WorkerManager struct {
	workers []worker.Worker
	dones   []chan struct{}
}

func NewWorkerManager() *WorkerManager {
	return &WorkerManager{
		workers: []worker.Worker{},
		dones:   []chan struct{}{},
	}
}

func (wm *WorkerManager) StartWorker(w worker.Worker) {
	wm.workers = append(wm.workers, w)

	done := make(chan struct{})
	wm.dones = append(wm.dones, done)

	go func() {
		if err := w.Run(worker.InterruptCh()); err != nil {
			log.Println("Worker stopped:", err)
		}
		close(done)
	}()
}

func (wm *WorkerManager) StopAllWorkers() {
	log.Println("Shutting down workers...")

	for _, w := range wm.workers {
		w.Stop()
	}

	for _, done := range wm.dones {
		<-done
	}

	log.Println("Workers exited gracefully")
}

func StartAllWorkersWithContext(ctx context.Context, repo *repository.Repository, config *config.Configuration) {
	c, err := NewTemporalClient(config)
	if err != nil {
		log.Fatalf("Failed to create Temporal client: %v", err)
	}

	manager := NewWorkerManager()

	// Start all workers
	// TODO: remove example worker later
	userWorker := example.StartUserWorker(c, *repo)
	manager.StartWorker(userWorker)

	<-ctx.Done()
	manager.StopAllWorkers()

	c.Close()
}
