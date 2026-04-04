package notifications

import (
	"time"

	"github.com/google/uuid"
)

const ScheduledNotificationTaskQueueName = "SCHEDULED_NOTIFICATION_TASK_QUEUE"

const JobTypePollDeadlineReminder = "poll_deadline_reminder"

type ScheduledNotificationInput struct {
	TriggerAt time.Time
	JobType   string
	Payload   []byte
}

type PollDeadlineReminderPayload struct {
	PollID   uuid.UUID
	TripID   uuid.UUID
	Deadline time.Time
}
