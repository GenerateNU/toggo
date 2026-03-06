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
	PublishEvent(ctx context.Context, topic realtime.EventTopic, tripID string, data interface{})
	ValidateDeadline(deadline *time.Time) error
	ValidatePollMinMaxOptions(options []models.CreatePollOptionRequest) error
	CreatePollWithTx(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePollRequest) (*models.Poll, []string, error)
	BuildPollEntity(tripID, userID uuid.UUID, req *models.CreatePollRequest) *models.Poll
	BuildOptionEntities(pollID uuid.UUID, req *models.CreatePollRequest) []models.PollOption
	UpdatePollWithTx(ctx context.Context, tripID, pollID uuid.UUID, req models.UpdatePollWithCategoriesRequest) (*models.Poll, []string, error)
}

var _ PollServiceInterface = (*PollService)(nil)

type PollService struct {
	repository *repository.Repository
	publisher  realtime.EventPublisher
}

func NewPollService(repo *repository.Repository, publisher realtime.EventPublisher) PollServiceInterface {
	return &PollService{
		repository: repo,
		publisher:  publisher,
	}
}

// publishEvent publishes a realtime event; failures are logged but never block the caller.
func (s *PollService) PublishEvent(ctx context.Context, topic realtime.EventTopic, tripID string, data interface{}) {
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

	return s.repository.PollCategory.ReplaceCategoriesForPoll(
		ctx,
		tx,
		tripID,
		pollID,
		&values,
	)
}
