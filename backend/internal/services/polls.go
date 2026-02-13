package services

import (
	"context"
	"errors"
	"log"
	"time"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/realtime"
	"toggo/internal/repository"
	"toggo/internal/utilities/pagination"

	"github.com/google/uuid"
)

type PollServiceInterface interface {
	CreatePoll(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePollRequest) (*models.PollAPIResponse, error)
	GetPoll(ctx context.Context, tripID, pollID, userID uuid.UUID) (*models.PollAPIResponse, error)
	GetPollsByTripID(ctx context.Context, tripID, userID uuid.UUID, limit int, cursorToken string) (*models.PollCursorPageResult, error)
	UpdatePoll(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.UpdatePollRequest) (*models.PollAPIResponse, error)
	DeletePoll(ctx context.Context, tripID, pollID, userID uuid.UUID) error
	AddOption(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CreatePollOptionRequest) (*models.PollOption, error)
	DeleteOption(ctx context.Context, tripID, pollID, optionID, userID uuid.UUID) error
	CastVote(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CastVoteRequest) (*models.PollAPIResponse, error)
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

// CreatePoll creates a new poll with initial options.
func (s *PollService) CreatePoll(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePollRequest) (*models.PollAPIResponse, error) {
	// Reject a deadline that is already in the past
	if req.Deadline != nil && time.Now().UTC().After(*req.Deadline) {
		return nil, errs.BadRequest(errors.New("deadline must be in the future"))
	}

	poll := &models.Poll{
		ID:        uuid.New(),
		TripID:    tripID,
		CreatedBy: userID,
		Question:  req.Question,
		PollType:  req.PollType,
		Deadline:  req.Deadline,
	}

	options := make([]models.PollOption, len(req.Options))
	for i, o := range req.Options {
		options[i] = models.PollOption{
			ID:         uuid.New(),
			OptionType: o.OptionType,
			EntityType: o.EntityType,
			EntityID:   o.EntityID,
			Name:       o.Name,
		}
	}

	created, err := s.repository.Poll.CreatePoll(ctx, poll, options)
	if err != nil {
		return nil, err
	}

	// New poll — no votes yet, use empty summary.
	resp := s.toAPIResponse(created, &models.PollVoteSummary{
		OptionVoteCounts: make(map[uuid.UUID]int),
		UserVotedOptions: make(map[uuid.UUID]bool),
	})

	// Publish poll.created event
	s.publishEvent(ctx, "poll.created", tripID.String(), resp)

	return resp, nil
}

// GetPoll returns a single poll with vote counts and the caller's votes.
func (s *PollService) GetPoll(ctx context.Context, tripID, pollID, userID uuid.UUID) (*models.PollAPIResponse, error) {
	poll, err := s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll.TripID != tripID {
		return nil, errs.ErrNotFound
	}

	summary, err := s.repository.Poll.GetPollVotes(ctx, pollID, userID)
	if err != nil {
		return nil, err
	}

	return s.toAPIResponse(poll, summary), nil
}

// GetPollsByTripID returns polls for a trip using cursor-based pagination.
func (s *PollService) GetPollsByTripID(ctx context.Context, tripID, userID uuid.UUID, limit int, cursorToken string) (*models.PollCursorPageResult, error) {
	cursor, err := pagination.ParseCursor(cursorToken)
	if err != nil {
		return nil, err
	}

	polls, nextCursor, err := s.repository.Poll.FindPollsByTripIDWithCursor(ctx, tripID, limit, cursor)
	if err != nil {
		return nil, err
	}

	// Collect poll IDs and fetch all vote summaries in one batch.
	pollIDs := make([]uuid.UUID, len(polls))
	for i, p := range polls {
		pollIDs[i] = p.ID
	}

	summaries, err := s.repository.Poll.GetPollsVotes(ctx, pollIDs, userID)
	if err != nil {
		return nil, err
	}

	apiPolls := make([]*models.PollAPIResponse, len(polls))
	for i, poll := range polls {
		apiPolls[i] = s.toAPIResponse(poll, summaries[poll.ID])
	}

	return s.buildPollPageResult(apiPolls, nextCursor, limit)
}

// UpdatePoll updates poll metadata. Only the poll creator can update.
// Updates are blocked once the deadline has passed.
func (s *PollService) UpdatePoll(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.UpdatePollRequest) (*models.PollAPIResponse, error) {
	poll, err := s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll.TripID != tripID {
		return nil, errs.ErrNotFound
	}
	if poll.CreatedBy != userID {
		return nil, errs.Forbidden()
	}

	// Cannot update a poll after the deadline has passed
	if poll.IsDeadlinePassed() {
		return nil, errs.BadRequest(errors.New("cannot update poll after the deadline has passed"))
	}

	// Reject setting a new deadline that is already in the past
	if req.Deadline != nil && time.Now().UTC().After(*req.Deadline) {
		return nil, errs.BadRequest(errors.New("deadline must be in the future"))
	}

	updated, err := s.repository.Poll.UpdatePoll(ctx, pollID, &req)
	if err != nil {
		return nil, err
	}

	summary, err := s.repository.Poll.GetPollVotes(ctx, pollID, userID)
	if err != nil {
		return nil, err
	}

	resp := s.toAPIResponse(updated, summary)

	// Publish poll.updated event
	s.publishEvent(ctx, "poll.updated", tripID.String(), resp)

	return resp, nil
}

// DeletePoll removes a poll. Only the poll creator or a trip admin can delete.
func (s *PollService) DeletePoll(ctx context.Context, tripID, pollID, userID uuid.UUID) error {
	poll, err := s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return err
	}
	if poll.TripID != tripID {
		return errs.ErrNotFound
	}

	if poll.CreatedBy != userID {
		isAdmin, err := s.repository.Membership.IsAdmin(ctx, tripID, userID)
		if err != nil {
			return err
		}
		if !isAdmin {
			return errs.Forbidden()
		}
	}

	if err := s.repository.Poll.DeletePoll(ctx, pollID); err != nil {
		return err
	}

	// Publish poll.deleted event
	s.publishEvent(ctx, "poll.deleted", tripID.String(), map[string]interface{}{
		"poll_id": pollID,
		"trip_id": tripID,
	})

	return nil
}

// AddOption adds an option to a poll. Only allowed if no votes exist yet.
func (s *PollService) AddOption(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CreatePollOptionRequest) (*models.PollOption, error) {
	poll, err := s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll.TripID != tripID {
		return nil, errs.ErrNotFound
	}

	// Cannot add options after the deadline has passed
	if poll.IsDeadlinePassed() {
		return nil, errs.BadRequest(errors.New("cannot add options after the poll deadline has passed"))
	}

	option := &models.PollOption{
		ID:         uuid.New(),
		PollID:     pollID,
		OptionType: req.OptionType,
		EntityType: req.EntityType,
		EntityID:   req.EntityID,
		Name:       req.Name,
	}

	return s.repository.Poll.AddOption(ctx, option)
}

// DeleteOption removes an option from a poll.
func (s *PollService) DeleteOption(ctx context.Context, tripID, pollID, optionID, userID uuid.UUID) error {
	poll, err := s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return err
	}
	if poll.TripID != tripID {
		return errs.ErrNotFound
	}

	return s.repository.Poll.DeleteOption(ctx, pollID, optionID)
}

// CastVote casts or replaces a user's vote(s) on a poll.
func (s *PollService) CastVote(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CastVoteRequest) (*models.PollAPIResponse, error) {
	poll, err := s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll.TripID != tripID {
		return nil, errs.ErrNotFound
	}

	// Cannot vote after the deadline has passed
	if poll.IsDeadlinePassed() {
		return nil, errs.BadRequest(errors.New("cannot vote after the poll deadline has passed"))
	}

	// Validate vote count based on poll type
	if poll.PollType == models.PollTypeSingle && len(req.OptionIDs) > 1 {
		return nil, errs.BadRequest(errors.New("single-choice polls allow only one vote"))
	}

	// Validate that all option IDs belong to this poll
	optionSet := make(map[uuid.UUID]bool)
	for _, opt := range poll.Options {
		optionSet[opt.ID] = true
	}
	for _, optionID := range req.OptionIDs {
		if !optionSet[optionID] {
			return nil, errs.BadRequest(errors.New("option does not belong to this poll"))
		}
	}

	votes := make([]models.PollVote, len(req.OptionIDs))
	for i, optionID := range req.OptionIDs {
		votes[i] = models.PollVote{
			PollID:   pollID,
			OptionID: optionID,
			UserID:   userID,
		}
	}

	_, err = s.repository.Poll.CastVote(ctx, pollID, userID, votes)
	if err != nil {
		return nil, err
	}

	// Fetch aggregated vote data and return the full poll state.
	summary, err := s.repository.Poll.GetPollVotes(ctx, pollID, userID)
	if err != nil {
		return nil, err
	}

	resp := s.toAPIResponse(poll, summary)

	// Publish poll.vote_added event with full updated poll state so
	// subscribed clients can update their UI without an extra GET request.
	s.publishEvent(ctx, "poll.vote_added", tripID.String(), resp)

	return resp, nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func (s *PollService) toAPIResponse(poll *models.Poll, summary *models.PollVoteSummary) *models.PollAPIResponse {
	options := make([]models.PollOptionAPIResponse, len(poll.Options))
	for i, opt := range poll.Options {
		options[i] = models.PollOptionAPIResponse{
			ID:         opt.ID,
			OptionType: opt.OptionType,
			EntityType: opt.EntityType,
			EntityID:   opt.EntityID,
			Name:       opt.Name,
			VoteCount:  summary.OptionVoteCounts[opt.ID],
			Voted:      summary.UserVotedOptions[opt.ID],
		}
	}

	return &models.PollAPIResponse{
		ID:        poll.ID,
		TripID:    poll.TripID,
		CreatedBy: poll.CreatedBy,
		Question:  poll.Question,
		PollType:  poll.PollType,
		CreatedAt: poll.CreatedAt,
		Deadline:  poll.Deadline,
		Options:   options,
	}
}

func (s *PollService) buildPollPageResult(apiPolls []*models.PollAPIResponse, nextCursor *models.PollCursor, limit int) (*models.PollCursorPageResult, error) {
	result := &models.PollCursorPageResult{
		Items: apiPolls,
		Limit: limit,
	}
	if nextCursor != nil {
		token, err := pagination.EncodeTimeUUIDCursor(*nextCursor)
		if err != nil {
			return nil, err
		}
		result.NextCursor = &token
	}
	return result, nil
}

// publishEvent publishes a realtime event; failures are logged but never block the caller.
func (s *PollService) publishEvent(ctx context.Context, topic, tripID string, data interface{}) {
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