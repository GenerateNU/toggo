package workflows

import (
	"log"
	"os"
	"toggo/internal/repository"
	"toggo/internal/workflows/example"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

func StartAllWorkers(repo *repository.Repository) worker.Worker {
	hostPort := os.Getenv("TEMPORAL_ADDRESS")
	if hostPort == "" {
		hostPort = "host.docker.internal:7233"
	}

	c, err := client.Dial(client.Options{HostPort: hostPort})
	if err != nil {
		log.Fatalln("Unable to connect to Temporal:", err)
	}

	userWorker := example.StartUserWorker(c, *repo)
	go func() {
		if err := userWorker.Run(nil); err != nil {
			log.Fatalln("Worker stopped unexpectedly:", err)
		}
	}()

	return userWorker
}

func runWorker(w worker.Worker) {
	if err := w.Run(nil); err != nil {
		log.Fatalln("Worker stopped unexpectedly:", err)
	}
}
