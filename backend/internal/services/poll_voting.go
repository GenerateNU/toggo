package services

import (
	"context"
	"errors"
	"time"
	"toggo/internal/constants"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"
	"toggo/internal/utilities/pagination"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type PollVotingServiceInterface interface {
	CreatePoll(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePollRequest) (*models.PollAPIResponse, error)
	GetPoll(ctx context.Context, tripID, pollID, userID uuid.UUID) (*models.PollAPIResponse, error)
	GetPollsByTripID(ctx context.Context, tripID, userID uuid.UUID, limit int, cursorToken string) (*models.PollCursorPageResult, error)
	UpdatePoll(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.UpdatePollWithCategoriesRequest) (*models.PollAPIResponse, error)
	DeletePoll(ctx context.Context, tripID, pollID, userID uuid.UUID) (*models.PollAPIResponse, error)
	AddOption(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CreatePollOptionRequest) (*models.PollOption, error)
	DeleteOption(ctx context.Context, tripID, pollID, optionID, userID uuid.UUID) (*models.PollOption, error)
	CastVote(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CastVoteRequest) (*models.PollAPIResponse, error)
}

var _ PollVotingServiceInterface = (*PollVotingService)(nil)

type PollVotingService struct {
	repository  *repository.Repository
	pollService PollServiceInterface
}

// NewPollVotingService creates a poll voting service with the given repository and event publisher.
func NewPollVotingService(repo *repository.Repository, pollService PollServiceInterface) PollVotingServiceInterface {
	return &PollVotingService{
		repository:  repo,
		pollService: pollService,
	}
}

// CreatePoll validates options, falls back to default "Yes"/"No" when none are
// provided, and inserts the poll + options in a single transaction.
func (s *PollVotingService) CreatePoll(
	ctx context.Context,
	tripID, userID uuid.UUID,
	req models.CreatePollRequest,
) (*models.PollAPIResponse, error) {
	if err := s.pollService.ValidateDeadline(req.Deadline); err != nil {
		return nil, err
	}
	if len(req.Options) == 0 {
		req.Options = s.defaultToYesNoPollOptions()
	}
	if err := s.pollService.ValidatePollMinMaxOptions(req.Options); err != nil {
		return nil, err
	}

	created, categoryNames, err := s.pollService.CreatePollWithTx(
		ctx,
		tripID,
		userID,
		req,
	)
	if err != nil {
		return nil, err
	}

	resp := s.toAPIResponse(
		created,
		&models.PollVoteSummary{
			OptionVoteCounts: make(map[uuid.UUID]int),
			UserVotedOptions: make(map[uuid.UUID]bool),
		},
		categoryNames,
	)

	s.pollService.PublishEvent(ctx, "poll.created", tripID.String(), resp)

	return resp, nil
}

// GetPoll returns a single poll with vote counts and the requesting user's vote state.
func (s *PollVotingService) GetPoll(ctx context.Context, tripID, pollID, userID uuid.UUID) (*models.PollAPIResponse, error) {
	poll, err := s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll.TripID != tripID {
		return nil, errs.ErrNotFound
	}

	summary, err := s.repository.PollVoting.GetPollVotes(ctx, pollID, userID)
	if err != nil {
		return nil, err
	}

	categoryNames, err := s.repository.PollCategory.GetPollCategories(ctx, pollID)
	if err != nil {
		return nil, err
	}

	return s.toAPIResponse(poll, summary, categoryNames), nil
}

// GetPollsByTripID returns a cursor-paginated list of polls for a trip, each
// enriched with vote counts and the requesting user's vote state.
func (s *PollVotingService) GetPollsByTripID(ctx context.Context, tripID, userID uuid.UUID, limit int, cursorToken string) (*models.PollCursorPageResult, error) {
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

	summaries, err := s.repository.PollVoting.GetPollsVotes(ctx, pollIDs, userID)
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
func (s *PollVotingService) UpdatePoll(
	ctx context.Context,
	tripID, pollID, userID uuid.UUID,
	req models.UpdatePollWithCategoriesRequest,
) (*models.PollAPIResponse, error) {

	if err := s.validateUpdatePollRequest(tripID, userID, pollID, req); err != nil {
		return nil, err
	}

	var updated *models.Poll
	var categoryNames []string

	err := s.repository.GetDB().RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var err error
		updated, categoryNames, err = s.updatePollTx(
			ctx,
			tx,
			tripID,
			pollID,
			req,
		)
		return err
	})
	if err != nil {
		return nil, err
	}

	summary, err := s.repository.PollVoting.GetPollVotes(ctx, pollID, userID)
	if err != nil {
		return nil, err
	}

	resp := s.toAPIResponse(updated, summary, categoryNames)

	s.pollService.PublishEvent(ctx, "poll.updated", tripID.String(), resp)

	return resp, nil
}

// DeletePoll removes a poll. Only the poll creator or a trip admin can delete.
func (s *PollVotingService) DeletePoll(ctx context.Context, tripID, pollID, userID uuid.UUID) (*models.PollAPIResponse, error) {
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

	summary, err := s.repository.PollVoting.GetPollVotes(ctx, pollID, userID)
	if err != nil {
		return nil, err
	}

	if _, err := s.repository.Poll.DeletePoll(ctx, pollID); err != nil {
		return nil, err
	}

	resp := s.toAPIResponse(poll, summary)
	s.pollService.PublishEvent(ctx, "poll.deleted", tripID.String(), resp)

	return resp, nil
}

// AddOption adds an option to a poll. Only the poll creator can add options.
// Blocked after the deadline has passed or after any votes have been cast
// (enforced at the repository level).
func (s *PollVotingService) AddOption(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CreatePollOptionRequest) (*models.PollOption, error) {
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

	option := &models.PollOption{
		ID:         uuid.New(),
		PollID:     pollID,
		OptionType: req.OptionType,
		EntityType: req.EntityType,
		EntityID:   req.EntityID,
		Name:       req.Name,
	}

	result, err := s.repository.Poll.AddOption(ctx, option, constants.MaxPollOptions)
	if errors.Is(err, errs.ErrMaxOptionsReached) {
		return nil, errs.BadRequest(errors.New("a poll cannot have more than 15 options"))
	}
	return result, err
}

// DeleteOption removes an option from a poll. Only the poll creator can delete
// options. Rejected if it would leave fewer than 2 options or if any votes
// already exist on the poll.
func (s *PollVotingService) DeleteOption(ctx context.Context, tripID, pollID, optionID, userID uuid.UUID) (*models.PollOption, error) {
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

	result, err := s.repository.Poll.DeleteOption(ctx, pollID, optionID, constants.MinPollOptions)
	if errors.Is(err, errs.ErrMinOptionsRequired) {
		return nil, errs.BadRequest(errors.New("a poll must have at least 2 options"))
	}
	return result, err
}

// CastVote replaces all of a user's existing votes on a poll with the new
// selection. Sending an empty OptionIDs slice removes all votes.
func (s *PollVotingService) CastVote(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CastVoteRequest) (*models.PollAPIResponse, error) {
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

	_, err = s.repository.PollVoting.CastVote(ctx, pollID, userID, votes)
	if err != nil {
		return nil, err
	}

	summary, err := s.repository.PollVoting.GetPollVotes(ctx, pollID, userID)
	if err != nil {
		return nil, err
	}

	resp := s.toAPIResponse(poll, summary)

	// Empty OptionIDs means the user is clearing their votes.
	topic := "poll.vote_added"
	if len(req.OptionIDs) == 0 {
		topic = "poll.vote_removed"
	}
	s.pollService.PublishEvent(ctx, topic, tripID.String(), resp)

	return resp, nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// toAPIResponse converts a Poll model and its vote summary into a PollAPIResponse.
func (s *PollVotingService) toAPIResponse(
	poll *models.Poll,
	summary *models.PollVoteSummary,
	categoryNames ...[]string,
) *models.PollAPIResponse {
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

	var categories []string
	if len(categoryNames) > 0 && categoryNames[0] != nil {
		categories = categoryNames[0]
	} else {
		categories = []string{}
	}

	return &models.PollAPIResponse{
		ID:                  poll.ID,
		TripID:              poll.TripID,
		CreatedBy:           poll.CreatedBy,
		Question:            poll.Question,
		PollType:            poll.PollType,
		CreatedAt:           poll.CreatedAt,
		Deadline:            poll.Deadline,
		IsAnonymous:         poll.IsAnonymous,
		ShouldNotifyMembers: poll.ShouldNotifyMembers,
		Options:             options,
		Categories:          categories,
	}
}

// buildPollPageResult wraps a slice of poll responses into a cursor-paginated result.
func (s *PollVotingService) buildPollPageResult(apiPolls []*models.PollAPIResponse, nextCursor *models.PollCursor, limit int) (*models.PollCursorPageResult, error) {
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

func (s *PollVotingService) defaultToYesNoPollOptions() []models.CreatePollOptionRequest {
	return []models.CreatePollOptionRequest{
		{
			OptionType: models.OptionTypeCustom,
			Name:       "Yes",
		},
		{
			OptionType: models.OptionTypeCustom,
			Name:       "No",
		},
	}
}

func (s *PollVotingService) buildPollEntity(tripID, userID uuid.UUID, req *models.CreatePollRequest) *models.Poll {
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

func (s *PollVotingService) buildOptionEntities(pollID uuid.UUID, req *models.CreatePollRequest) []models.PollOption {
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

func (s *PollVotingService) createPollTx(
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

func (s *PollVotingService) validateUpdatePollRequest(
	tripID, userID uuid.UUID,
	pollID uuid.UUID,
	req models.UpdatePollWithCategoriesRequest,
) error {
	if req.Question == nil &&
		req.Deadline == nil &&
		req.IsAnonymous == nil &&
		req.Categories == nil {
		return errs.BadRequest(errors.New("at least one field must be provided"))
	}

	poll, err := s.repository.Poll.FindPollByID(context.Background(), pollID)
	if err != nil {
		return err
	}

	if poll.TripID != tripID {
		return errs.ErrNotFound
	}

	if poll.CreatedBy != userID {
		return errs.Forbidden()
	}

	if poll.IsDeadlinePassed() {
		return errs.BadRequest(errors.New("cannot update poll after the deadline has passed"))
	}

	if req.Deadline != nil && time.Now().UTC().After(*req.Deadline) {
		return errs.BadRequest(errors.New("deadline must be in the future"))
	}

	return nil
}

func (s *PollVotingService) updatePollTx(ctx context.Context, tx bun.Tx, tripID, pollID uuid.UUID, req models.UpdatePollWithCategoriesRequest) (*models.Poll, []string, error) {
	var (
		updated       *models.Poll
		categoryNames []string
		err           error
	)

	updated, err = s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return nil, nil, err
	}

	// update poll fields only if they are provided in the request; otherwise keep existing values
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
			return nil, nil, err
		}
	}

	// update categories to link with poll
	var categories []string
	if req.Categories != nil {
		categories = *req.Categories
	} else {
		categories = nil
	}

	categoryNames, err = s.updatePollCategories(
		ctx,
		tx,
		tripID,
		pollID,
		categories,
	)
	if err != nil {
		return nil, nil, err
	}

	return updated, categoryNames, nil
}

func (s *PollVotingService) updatePollCategories(
	ctx context.Context,
	tx bun.Tx,
	tripID, pollID uuid.UUID,
	categories []string,
) ([]string, error) {
	if categories != nil {
		return s.repository.PollCategory.ReplaceCategoriesForPoll(
			ctx,
			tx,
			tripID,
			pollID,
			&categories,
		)
	}
	return s.repository.PollCategory.GetPollCategories(ctx, pollID)
}
