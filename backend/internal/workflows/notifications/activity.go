package notifications

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"
	"toggo/internal/models"
	"toggo/internal/services"

	"github.com/google/uuid"
)

type PollMetaFinder interface {
	FindPollMetaByID(ctx context.Context, pollID uuid.UUID) (*models.Poll, error)
}

type VoterStatusProvider interface {
	GetVoterStatus(ctx context.Context, pollID uuid.UUID, tripID uuid.UUID) ([]models.VoterInfo, error)
}

type TokenFetcher interface {
	GetUsersWithDeviceTokens(ctx context.Context, userIDs []uuid.UUID) ([]*models.User, error)
}

type NotificationSender interface {
	SendNotification(ctx context.Context, req models.SendNotificationRequest) error
}

const pollDeadlineReminderTitle = "Don't forget to vote!"

type NotificationActivities struct {
	PollRepo           PollMetaFinder
	PollRankingRepo    VoterStatusProvider
	PollVotingRepo     VoterStatusProvider
	UserRepo           TokenFetcher
	NotificationSender NotificationSender
}

// DispatchNotification is the single activity entry point for all scheduled
// notification types. It decodes the payload and delegates to the appropriate
// handler based on JobType.
func (a *NotificationActivities) DispatchNotification(
	ctx context.Context,
	input ScheduledNotificationInput,
) error {
	switch input.JobType {
	case JobTypePollDeadlineReminder:
		var payload PollDeadlineReminderPayload
		if err := json.Unmarshal(input.Payload, &payload); err != nil {
			return fmt.Errorf("failed to decode poll deadline reminder payload: %w", err)
		}
		return a.handlePollDeadlineReminder(ctx, payload)
	default:
		return fmt.Errorf("unknown job type: %s", input.JobType)
	}
}

func (a *NotificationActivities) handlePollDeadlineReminder(
	ctx context.Context,
	payload PollDeadlineReminderPayload,
) error {
	poll, ok := a.validatePollForReminder(ctx, payload.PollID)
	if !ok {
		return nil
	}

	unvotedIDs, err := a.getUnvotedMemberIDs(ctx, poll, payload)
	if err != nil {
		return err
	}
	if len(unvotedIDs) == 0 {
		log.Printf("poll_deadline_reminder: all members have voted on poll %s, skipping", payload.PollID)
		return nil
	}

	users, err := a.UserRepo.GetUsersWithDeviceTokens(ctx, unvotedIDs)
	if err != nil {
		return fmt.Errorf("failed to get users with device tokens: %w", err)
	}
	if len(users) == 0 {
		log.Printf("poll_deadline_reminder: no users with device tokens for poll %s", payload.PollID)
		return nil
	}

	sent := a.sendReminders(ctx, poll, payload, users)
	log.Printf("poll_deadline_reminder: sent reminders to %d/%d users for poll %s", sent, len(users), payload.PollID)
	return nil
}

func (a *NotificationActivities) validatePollForReminder(ctx context.Context, pollID uuid.UUID) (*models.Poll, bool) {
	poll, err := a.PollRepo.FindPollMetaByID(ctx, pollID)
	if err != nil {
		log.Printf("poll_deadline_reminder: poll %s not found, skipping", pollID)
		return nil, false
	}
	if poll.Deadline == nil {
		log.Printf("poll_deadline_reminder: poll %s has no deadline, skipping", pollID)
		return nil, false
	}
	timeUntilDeadline := time.Until(*poll.Deadline)
	if timeUntilDeadline <= 0 {
		log.Printf("poll_deadline_reminder: poll %s deadline already passed, skipping", pollID)
		return nil, false
	}
	if timeUntilDeadline > 24*time.Hour {
		log.Printf("poll_deadline_reminder: poll %s outside 24h window, skipping", pollID)
		return nil, false
	}
	return poll, true
}

func (a *NotificationActivities) getUnvotedMemberIDs(ctx context.Context, poll *models.Poll, payload PollDeadlineReminderPayload) ([]uuid.UUID, error) {
	var voters []models.VoterInfo
	var err error
	switch poll.PollType {
	case models.PollTypeRank:
		voters, err = a.PollRankingRepo.GetVoterStatus(ctx, payload.PollID, payload.TripID)
	default:
		voters, err = a.PollVotingRepo.GetVoterStatus(ctx, payload.PollID, payload.TripID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get voter status: %w", err)
	}

	var unvotedIDs []uuid.UUID
	for _, v := range voters {
		if !v.HasVoted {
			unvotedIDs = append(unvotedIDs, v.UserID)
		}
	}
	return unvotedIDs, nil
}

func (a *NotificationActivities) sendReminders(ctx context.Context, poll *models.Poll, payload PollDeadlineReminderPayload, users []*models.User) int {
	data := map[string]interface{}{
		"poll_id": payload.PollID.String(),
		"trip_id": payload.TripID.String(),
	}
	sent := 0
	for _, u := range users {
		body := formatDeadlineBody(poll.Question, *poll.Deadline, u.Timezone)
		req := models.SendNotificationRequest{
			UserID: u.ID,
			Title:  pollDeadlineReminderTitle,
			Body:   body,
			Data:   data,
		}
		if err := a.NotificationSender.SendNotification(ctx, req); err != nil {
			log.Printf("poll_deadline_reminder: failed to notify user %s: %v", u.ID, err)
			continue
		}
		sent++
	}
	return sent
}

func formatDeadlineBody(question string, deadline time.Time, timezone string) string {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc = time.UTC
	}
	formatted := deadline.In(loc).Format("Jan 2 at 3:04 PM MST")
	return fmt.Sprintf("The poll \"%s\" closes on %s.", question, formatted)
}

var _ NotificationSender = (services.NotificationService)(nil)
