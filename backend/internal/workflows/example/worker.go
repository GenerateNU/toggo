package example

import (
	"log"
	"toggo/internal/repository"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

func StartUserWorker(c client.Client, repository repository.Repository) worker.Worker {
	w := worker.New(c, UserExampleTaskQueueName, worker.Options{})

	w.RegisterWorkflow(UserWorkflow)

	w.RegisterActivity(&UserActivities{Repository: &repository})

	log.Println("User worker registered on task queue:", UserExampleTaskQueueName)
	return w
}
