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
	"toggo/internal/utilities/pagination"

	"github.com/google/uuid"
)

type PollServiceInterface interface {
	CreatePoll(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePollRequest) (*models.PollAPIResponse, error)
	GetPoll(ctx context.Context, tripID, pollID, userID uuid.UUID) (*models.PollAPIResponse, error)
	GetPollsByTripID(ctx context.Context, tripID, userID uuid.UUID, limit int, cursorToken string) (*models.PollCursorPageResult, error)
	UpdatePoll(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.UpdatePollRequest) (*models.PollAPIResponse, error)
	DeletePoll(ctx context.Context, tripID, pollID, userID uuid.UUID) (*models.PollAPIResponse, error)
	AddOption(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CreatePollOptionRequest) (*models.PollOption, error)
	DeleteOption(ctx context.Context, tripID, pollID, optionID, userID uuid.UUID) (*models.PollOption, error)
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

// CreatePoll validates options, falls back to default "Yes"/"No" when none are
// provided, and inserts the poll + options in a single transaction.
func (s *PollService) CreatePoll(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePollRequest) (*models.PollAPIResponse, error) {
	if req.Deadline != nil && time.Now().UTC().After(*req.Deadline) {
		return nil, errs.BadRequest(errors.New("deadline must be in the future"))
	}

	if len(req.Options) == 0 {
		req.Options = []models.CreatePollOptionRequest{
			{OptionType: models.OptionTypeCustom, Name: "Yes"},
			{OptionType: models.OptionTypeCustom, Name: "No"},
		}
	}

	if len(req.Options) < constants.MinPollOptions {
		return nil, errs.BadRequest(errors.New("a poll must have at least 2 options"))
	}

	if len(req.Options) > constants.MaxPollOptions {
		return nil, errs.BadRequest(errors.New("a poll cannot have more than 15 options"))
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

	resp := s.toAPIResponse(created, &models.PollVoteSummary{
		OptionVoteCounts: make(map[uuid.UUID]int),
		UserVotedOptions: make(map[uuid.UUID]bool),
	})

	s.publishEvent(ctx, "poll.created", tripID.String(), resp)

	return resp, nil
}

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

// UpdatePoll updates poll metadata. Only the poll creator can update, and
// updates are blocked once the deadline has passed.
func (s *PollService) UpdatePoll(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.UpdatePollRequest) (*models.PollAPIResponse, error) {
	if req.Question == nil && req.Deadline == nil {
		return nil, errs.BadRequest(errors.New("at least one field must be provided"))
	}

	meta, err := s.repository.Poll.FindPollMetaByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if meta.TripID != tripID {
		return nil, errs.ErrNotFound
	}
	if meta.CreatedBy != userID {
		return nil, errs.Forbidden()
	}

	if meta.IsDeadlinePassed() {
		return nil, errs.BadRequest(errors.New("cannot update poll after the deadline has passed"))
	}

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
	s.publishEvent(ctx, "poll.updated", tripID.String(), resp)

	return resp, nil
}

// DeletePoll removes a poll. Only the poll creator or a trip admin can delete.
func (s *PollService) DeletePoll(ctx context.Context, tripID, pollID, userID uuid.UUID) (*models.PollAPIResponse, error) {
	poll, err := s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll.TripID != tripID {
		return nil, errs.ErrNotFound
	}

	if poll.CreatedBy != userID {
		isAdmin, err := s.repository.Membership.IsAdmin(ctx, tripID, userID)
		if err != nil {
			return nil, err
		}
		if !isAdmin {
			return nil, errs.Forbidden()
		}
	}

	summary, err := s.repository.Poll.GetPollVotes(ctx, pollID, userID)
	if err != nil {
		return nil, err
	}

	if _, err := s.repository.Poll.DeletePoll(ctx, pollID); err != nil {
		return nil, err
	}

	resp := s.toAPIResponse(poll, summary)
	s.publishEvent(ctx, "poll.deleted", tripID.String(), resp)

	return resp, nil
}

// AddOption adds an option to a poll. Only the poll creator can add options.
// Blocked after the deadline has passed or after any votes have been cast
// (enforced at the repository level).
func (s *PollService) AddOption(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CreatePollOptionRequest) (*models.PollOption, error) {
	meta, err := s.repository.Poll.FindPollMetaByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if meta.TripID != tripID {
		return nil, errs.ErrNotFound
	}
	if meta.CreatedBy != userID {
		return nil, errs.Forbidden()
	}

	if meta.IsDeadlinePassed() {
		return nil, errs.BadRequest(errors.New("cannot add options after the poll deadline has passed"))
	}

	optionCount, err := s.repository.Poll.CountOptions(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if optionCount >= constants.MaxPollOptions {
		return nil, errs.BadRequest(errors.New("a poll cannot have more than 15 options"))
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

// DeleteOption removes an option from a poll. Only the poll creator can delete
// options. Rejected if it would leave fewer than 2 options or if any votes
// already exist on the poll.
func (s *PollService) DeleteOption(ctx context.Context, tripID, pollID, optionID, userID uuid.UUID) (*models.PollOption, error) {
	meta, err := s.repository.Poll.FindPollMetaByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if meta.TripID != tripID {
		return nil, errs.ErrNotFound
	}
	if meta.CreatedBy != userID {
		return nil, errs.Forbidden()
	}

	if meta.IsDeadlinePassed() {
		return nil, errs.BadRequest(errors.New("cannot delete options after the poll deadline has passed"))
	}

	optionCount, err := s.repository.Poll.CountOptions(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if optionCount <= constants.MinPollOptions {
		return nil, errs.BadRequest(errors.New("a poll must have at least 2 options"))
	}

	return s.repository.Poll.DeleteOption(ctx, pollID, optionID)
}

// CastVote replaces all of a user's existing votes on a poll with the new
// selection. Sending an empty OptionIDs slice removes all votes.
func (s *PollService) CastVote(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CastVoteRequest) (*models.PollAPIResponse, error) {
	poll, err := s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll.TripID != tripID {
		return nil, errs.ErrNotFound
	}

	if poll.IsDeadlinePassed() {
		return nil, errs.BadRequest(errors.New("cannot vote after the poll deadline has passed"))
	}

	if poll.PollType == models.PollTypeSingle && len(req.OptionIDs) > 1 {
		return nil, errs.BadRequest(errors.New("single-choice polls allow only one vote"))
	}

	optionSet := make(map[uuid.UUID]bool)
	for _, opt := range poll.Options {
		optionSet[opt.ID] = true
	}
	seen := make(map[uuid.UUID]bool, len(req.OptionIDs))
	for _, optionID := range req.OptionIDs {
		if !optionSet[optionID] {
			return nil, errs.BadRequest(errors.New("option does not belong to this poll"))
		}
		if seen[optionID] {
			return nil, errs.BadRequest(errors.New("duplicate option IDs are not allowed"))
		}
		seen[optionID] = true
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

	summary, err := s.repository.Poll.GetPollVotes(ctx, pollID, userID)
	if err != nil {
		return nil, err
	}

	resp := s.toAPIResponse(poll, summary)

	// Empty OptionIDs means the user is clearing their votes.
	topic := "poll.vote_added"
	if len(req.OptionIDs) == 0 {
		topic = "poll.vote_removed"
	}
	s.publishEvent(ctx, topic, tripID.String(), resp)

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
