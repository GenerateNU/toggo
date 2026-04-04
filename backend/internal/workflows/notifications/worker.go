package notifications

import (
	"log"
	"toggo/internal/repository"
	"toggo/internal/services"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

func StartNotificationWorker(c client.Client, repo repository.Repository, expoClient services.ExpoClient) worker.Worker {
	w := worker.New(c, ScheduledNotificationTaskQueueName, worker.Options{})

	w.RegisterWorkflow(ScheduledNotificationWorkflow)

	notificationService := services.NewNotificationService(repo.User, repo.Membership, expoClient)

	w.RegisterActivity(&NotificationActivities{
		PollRepo:           repo.Poll,
		PollRankingRepo:    repo.PollRanking,
		PollVotingRepo:     repo.PollVoting,
		UserRepo:           repo.User,
		NotificationSender: notificationService,
	})

	log.Println("Notification worker registered on task queue:", ScheduledNotificationTaskQueueName)
	return w
}
