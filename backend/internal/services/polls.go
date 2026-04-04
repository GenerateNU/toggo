package services

import (
	"context"
	"errors"
	"log"
	"time"
	"toggo/internal/constants"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/realtime"
	"toggo/internal/repository"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type PollServiceInterface interface {
	PublishEvent(ctx context.Context, topic realtime.EventTopic, tripID string, data any)
	PublishEventWithActor(ctx context.Context, topic realtime.EventTopic, tripID, entityID, actorID string, data any)
	ValidateDeadline(deadline *time.Time) error
	ValidatePollMinMaxOptions(options []models.CreatePollOptionRequest) error
	CreatePollWithTx(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePollRequest) (*models.Poll, []string, error)
	BuildPollEntity(tripID, userID uuid.UUID, req *models.CreatePollRequest) *models.Poll
	BuildOptionEntities(pollID uuid.UUID, req *models.CreatePollRequest) []models.PollOption
	UpdatePollWithTx(ctx context.Context, tripID, pollID uuid.UUID, req models.UpdatePollWithCategoriesRequest) (*models.Poll, []string, error)
	ScheduleDeadlineReminder(ctx context.Context, pollID, tripID uuid.UUID, deadline *time.Time) error
	CancelDeadlineReminder(ctx context.Context, pollID uuid.UUID) error
}

var _ PollServiceInterface = (*PollService)(nil)

// schedules and cancels poll deadline reminders; defined here to avoid an import cycle with workflows
type DeadlineScheduler interface {
	ScheduleDeadlineReminder(ctx context.Context, pollID, tripID uuid.UUID, deadline time.Time) error
	CancelDeadlineReminder(ctx context.Context, pollID uuid.UUID) error
}

type PollService struct {
	repository *repository.Repository
	publisher  realtime.EventPublisher
	scheduler  DeadlineScheduler
}

func NewPollService(repo *repository.Repository, publisher realtime.EventPublisher, scheduler DeadlineScheduler) PollServiceInterface {
	return &PollService{
		repository: repo,
		publisher:  publisher,
		scheduler:  scheduler,
	}
}

// PublishEvent publishes a realtime event; failures are logged but never block the caller.
func (s *PollService) PublishEvent(ctx context.Context, topic realtime.EventTopic, tripID string, data any) {
	if s.publisher == nil {
		return
	}
	event, err := realtime.NewEvent(topic, tripID, data)
	if err != nil {
		log.Printf("Failed to create %s event: %v", topic, err)
		return
	}
	if err := s.publisher.Publish(ctx, event); err != nil {
		log.Printf("Failed to publish %s event: %v", topic, err)
	}
}

// PublishEventWithActor publishes a realtime event with actor attribution.
func (s *PollService) PublishEventWithActor(ctx context.Context, topic realtime.EventTopic, tripID, entityID, actorID string, data any) {
	if s.publisher == nil {
		return
	}
	event, err := realtime.NewEventWithActor(topic, tripID, entityID, actorID, "", data)
	if err != nil {
		log.Printf("Failed to create %s event: %v", topic, err)
		return
	}
	if err := s.publisher.Publish(ctx, event); err != nil {
		log.Printf("Failed to publish %s event: %v", topic, err)
	}
}

func (s *PollService) ValidateDeadline(deadline *time.Time) error {
	if deadline != nil && time.Now().UTC().After(*deadline) {
		return errs.BadRequest(errors.New("deadline must be in the future"))
	}
	return nil
}

func (s *PollService) ValidatePollMinMaxOptions(options []models.CreatePollOptionRequest) error {
	if len(options) < constants.MinPollOptions {
		return errs.BadRequest(errors.New("a poll must have at least 2 options"))
	}
	if len(options) > constants.MaxPollOptions {
		return errs.BadRequest(errors.New("a poll cannot have more than 15 options"))
	}
	return nil
}

func (s *PollService) BuildPollEntity(tripID, userID uuid.UUID, req *models.CreatePollRequest) *models.Poll {
	return &models.Poll{
		ID:                  uuid.New(),
		TripID:              tripID,
		CreatedBy:           userID,
		Question:            req.Question,
		PollType:            req.PollType,
		Deadline:            req.Deadline,
		IsAnonymous:         req.IsAnonymous,
		ShouldNotifyMembers: req.ShouldNotifyMembers,
	}
}

func (s *PollService) BuildOptionEntities(pollID uuid.UUID, req *models.CreatePollRequest) []models.PollOption {
	options := make([]models.PollOption, len(req.Options))
	for i, opt := range req.Options {
		options[i] = models.PollOption{
			ID:         uuid.New(),
			PollID:     pollID,
			OptionType: opt.OptionType,
			EntityType: opt.EntityType,
			EntityID:   opt.EntityID,
			Name:       opt.Name,
		}
	}
	return options
}

func (s *PollService) createPollTx(
	ctx context.Context,
	tx bun.Tx,
	tripID uuid.UUID,
	poll *models.Poll,
	options []models.PollOption,
	categories []string,
) (*models.Poll, []string, error) {
	created, err := s.repository.Poll.CreatePoll(ctx, tx, poll, options)
	if err != nil {
		return nil, nil, err
	}

	if len(categories) > 0 {
		if err := s.repository.Category.EnsureCategoriesExistTx(ctx, tx, tripID, categories); err != nil {
			return nil, nil, err
		}
	}

	categoryNames, err := s.repository.PollCategory.ReplaceCategoriesForPoll(
		ctx,
		tx,
		tripID,
		created.ID,
		&categories,
	)
	if err != nil {
		return nil, nil, err
	}

	return created, categoryNames, nil
}

func (s *PollService) CreatePollWithTx(
	ctx context.Context,
	tripID, userID uuid.UUID,
	req models.CreatePollRequest,
) (*models.Poll, []string, error) {

	poll := s.BuildPollEntity(tripID, userID, &req)

	pollOptions := s.BuildOptionEntities(poll.ID, &req)
	pollCategories := req.Categories

	var created *models.Poll
	var categoryNames []string

	err := s.repository.GetDB().RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var err error
		created, categoryNames, err = s.createPollTx(
			ctx,
			tx,
			tripID,
			poll,
			pollOptions,
			pollCategories,
		)
		return err
	})

	if err != nil {
		return nil, nil, err
	}

	if err := s.ScheduleDeadlineReminder(ctx, created.ID, tripID, created.Deadline); err != nil {
		log.Printf("failed to schedule deadline reminder for poll %s: %v", created.ID, err)
	}

	return created, categoryNames, nil
}

func (s *PollService) UpdatePollWithTx(
	ctx context.Context,
	tripID, pollID uuid.UUID,
	req models.UpdatePollWithCategoriesRequest,
) (*models.Poll, []string, error) {

	var (
		updated       *models.Poll
		categoryNames []string
	)

	err := s.repository.GetDB().RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var err error
		// Update poll fields if present
		if req.Question != nil ||
			req.Deadline != nil ||
			req.IsAnonymous != nil {

			updated, err = s.repository.Poll.UpdatePoll(
				ctx,
				tx,
				pollID,
				&models.UpdatePollRequest{
					Question:    req.Question,
					Deadline:    req.Deadline,
					IsAnonymous: req.IsAnonymous,
				},
			)

			if err != nil {
				return err
			}

		} else {
			updated, err = s.repository.Poll.FindPollByID(ctx, pollID)
			if err != nil {
				return err
			}
		}

		// Categories logic
		categoryNames, err = s.resolveCategoryUpdate(
			ctx,
			tx,
			tripID,
			pollID,
			req.Categories,
		)

		return err
	})

	if err != nil {
		return nil, nil, err
	}

	if req.Deadline != nil {
		if err := s.ScheduleDeadlineReminder(ctx, pollID, tripID, req.Deadline); err != nil {
			log.Printf("failed to reschedule deadline reminder for poll %s: %v", pollID, err)
		}
	}

	return updated, categoryNames, nil
}

func (s *PollService) resolveCategoryUpdate(
	ctx context.Context,
	tx bun.Tx,
	tripID, pollID uuid.UUID,
	categories *[]string,
) ([]string, error) {

	if categories == nil {
		return s.repository.PollCategory.GetPollCategories(ctx, pollID)
	}

	values := *categories

	if len(values) > 0 {
		if err := s.repository.Category.EnsureCategoriesExistTx(ctx, tx, tripID, values); err != nil {
			return nil, err
		}
	}

	return s.repository.PollCategory.ReplaceCategoriesForPoll(
		ctx,
		tx,
		tripID,
		pollID,
		&values,
	)
}

func (s *PollService) ScheduleDeadlineReminder(ctx context.Context, pollID, tripID uuid.UUID, deadline *time.Time) error {
	if s.scheduler == nil || deadline == nil {
		return nil
	}
	return s.scheduler.ScheduleDeadlineReminder(ctx, pollID, tripID, *deadline)
}

func (s *PollService) CancelDeadlineReminder(ctx context.Context, pollID uuid.UUID) error {
	if s.scheduler == nil {
		return nil
	}
	return s.scheduler.CancelDeadlineReminder(ctx, pollID)
}
