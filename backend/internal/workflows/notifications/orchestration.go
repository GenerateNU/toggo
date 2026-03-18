package notifications

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"go.temporal.io/api/serviceerror"
	"go.temporal.io/sdk/client"
)

type PollScheduler struct {
	client client.Client
}

func NewPollScheduler(c client.Client) *PollScheduler {
	return &PollScheduler{client: c}
}

func (s *PollScheduler) ScheduleDeadlineReminder(ctx context.Context, pollID, tripID uuid.UUID, deadline time.Time) error {
	payload, err := json.Marshal(PollDeadlineReminderPayload{
		PollID:   pollID,
		TripID:   tripID,
		Deadline: deadline,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal poll deadline reminder payload: %w", err)
	}

	input := ScheduledNotificationInput{
		TriggerAt: deadline.Add(-24 * time.Hour),
		JobType:   JobTypePollDeadlineReminder,
		Payload:   payload,
	}

	workflowOptions := client.StartWorkflowOptions{
		ID:        pollDeadlineReminderWorkflowID(pollID),
		TaskQueue: ScheduledNotificationTaskQueueName,
	}

	if err := s.CancelDeadlineReminder(ctx, pollID); err != nil {
		log.Printf("poll_scheduler: failed to cancel existing reminder for poll %s: %v", pollID, err)
	}

	we, err := s.client.ExecuteWorkflow(ctx, workflowOptions, ScheduledNotificationWorkflow, input)
	if err != nil {
		return fmt.Errorf("failed to schedule deadline reminder for poll %s: %w", pollID, err)
	}

	log.Printf("poll_scheduler: scheduled deadline reminder for poll %s (workflowID=%s, runID=%s)", pollID, we.GetID(), we.GetRunID())
	return nil
}

func (s *PollScheduler) CancelDeadlineReminder(ctx context.Context, pollID uuid.UUID) error {
	err := s.client.CancelWorkflow(ctx, pollDeadlineReminderWorkflowID(pollID), "")
	if err != nil {
		if isNotFound(err) {
			return nil
		}
		return fmt.Errorf("failed to cancel deadline reminder for poll %s: %w", pollID, err)
	}
	return nil
}

func pollDeadlineReminderWorkflowID(pollID uuid.UUID) string {
	return "poll-deadline-reminder-" + pollID.String()
}

func isNotFound(err error) bool {
	if err == nil {
		return false
	}
	var serviceErr *serviceerror.NotFound
	return errors.As(err, &serviceErr)
}
