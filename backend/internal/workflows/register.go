package workflows

import (
	"context"
	"log"
	"toggo/internal/repository"
	"toggo/internal/workflows/example"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

func StartAllWorkersWithContext(ctx context.Context, repo *repository.Repository) {
	c, err := client.Dial(client.Options{
		HostPort: "host.docker.internal:7233",
	})
	if err != nil {
		log.Fatalln("Unable to connect to Temporal:", err)
	}

	userWorker := example.StartUserWorker(c, *repo)

	// Start worker in a goroutine
	done := make(chan struct{})
	go func() {
		if err := userWorker.Run(worker.InterruptCh()); err != nil {
			log.Println("Worker stopped:", err)
		}
		close(done)
	}()

	// Wait for shutdown signal
	<-ctx.Done()
	log.Println("Shutting down workers...")

	// Stop worker first (stops polling)
	userWorker.Stop()
	<-done

	// Close client last (closes gRPC connection)
	c.Close()

	log.Println("Workers exited gracefully")
}
