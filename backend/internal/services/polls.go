package services

import (
	"context"
	"errors"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/google/uuid"
)

type PollServiceInterface interface {
	CreatePoll(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePollRequest) (*models.PollAPIResponse, error)
	GetPoll(ctx context.Context, tripID, pollID, userID uuid.UUID) (*models.PollAPIResponse, error)
	GetPollsByTripID(ctx context.Context, tripID, userID uuid.UUID) ([]*models.PollAPIResponse, error)
	UpdatePoll(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.UpdatePollRequest) (*models.PollAPIResponse, error)
	DeletePoll(ctx context.Context, tripID, pollID, userID uuid.UUID) error
	AddOption(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CreatePollOptionRequest) (*models.PollOption, error)
	DeleteOption(ctx context.Context, tripID, pollID, optionID, userID uuid.UUID) error
	CastVote(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CastVoteRequest) ([]models.PollVote, error)
}

var _ PollServiceInterface = (*PollService)(nil)

type PollService struct {
	repository *repository.Repository
}

func NewPollService(repo *repository.Repository) PollServiceInterface {
	return &PollService{
		repository: repo,
	}
}

// CreatePoll creates a new poll with initial options.
func (s *PollService) CreatePoll(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePollRequest) (*models.PollAPIResponse, error) {
	if err := s.assertMember(ctx, tripID, userID); err != nil {
		return nil, err
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

	return s.toAPIResponse(created, nil, nil), nil
}

// GetPoll returns a single poll with vote counts and the caller's votes.
func (s *PollService) GetPoll(ctx context.Context, tripID, pollID, userID uuid.UUID) (*models.PollAPIResponse, error) {
	if err := s.assertMember(ctx, tripID, userID); err != nil {
		return nil, err
	}

	poll, err := s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll.TripID != tripID {
		return nil, errs.ErrNotFound
	}

	allVotes, err := s.repository.Poll.GetVotesByPollID(ctx, pollID)
	if err != nil {
		return nil, err
	}

	userVotes, err := s.repository.Poll.GetUserVotes(ctx, pollID, userID)
	if err != nil {
		return nil, err
	}

	return s.toAPIResponse(poll, allVotes, userVotes), nil
}

// GetPollsByTripID returns all polls for a trip with vote counts.
func (s *PollService) GetPollsByTripID(ctx context.Context, tripID, userID uuid.UUID) ([]*models.PollAPIResponse, error) {
	if err := s.assertMember(ctx, tripID, userID); err != nil {
		return nil, err
	}

	polls, err := s.repository.Poll.FindPollsByTripID(ctx, tripID)
	if err != nil {
		return nil, err
	}

	results := make([]*models.PollAPIResponse, len(polls))
	for i, poll := range polls {
		allVotes, err := s.repository.Poll.GetVotesByPollID(ctx, poll.ID)
		if err != nil {
			return nil, err
		}

		userVotes, err := s.repository.Poll.GetUserVotes(ctx, poll.ID, userID)
		if err != nil {
			return nil, err
		}

		results[i] = s.toAPIResponse(poll, allVotes, userVotes)
	}

	return results, nil
}

// UpdatePoll updates poll metadata. Only the poll creator can update.
func (s *PollService) UpdatePoll(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.UpdatePollRequest) (*models.PollAPIResponse, error) {
	if err := s.assertMember(ctx, tripID, userID); err != nil {
		return nil, err
	}

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

	updated, err := s.repository.Poll.UpdatePoll(ctx, pollID, &req)
	if err != nil {
		return nil, err
	}

	return s.toAPIResponse(updated, nil, nil), nil
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

	return s.repository.Poll.DeletePoll(ctx, pollID)
}

// AddOption adds an option to a poll. Only allowed if no votes exist yet.
func (s *PollService) AddOption(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CreatePollOptionRequest) (*models.PollOption, error) {
	if err := s.assertMember(ctx, tripID, userID); err != nil {
		return nil, err
	}

	poll, err := s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll.TripID != tripID {
		return nil, errs.ErrNotFound
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

// DeleteOption removes an option. Only allowed if no votes exist yet.
func (s *PollService) DeleteOption(ctx context.Context, tripID, pollID, optionID, userID uuid.UUID) error {
	if err := s.assertMember(ctx, tripID, userID); err != nil {
		return err
	}

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
func (s *PollService) CastVote(ctx context.Context, tripID, pollID, userID uuid.UUID, req models.CastVoteRequest) ([]models.PollVote, error) {
	if err := s.assertMember(ctx, tripID, userID); err != nil {
		return nil, err
	}

	poll, err := s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll.TripID != tripID {
		return nil, errs.ErrNotFound
	}

	// Validate vote count based on poll type
	if poll.PollType == models.PollTypeSingle && len(req.OptionIDs) > 1 {
		return nil, errs.BadRequest(errors.New("single-choice polls allow only one vote"))
	}

	votes := make([]models.PollVote, len(req.OptionIDs))
	for i, optionID := range req.OptionIDs {
		votes[i] = models.PollVote{
			PollID:   pollID,
			OptionID: optionID,
			UserID:   userID,
		}
	}

	return s.repository.Poll.CastVote(ctx, pollID, userID, votes)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func (s *PollService) assertMember(ctx context.Context, tripID, userID uuid.UUID) error {
	isMember, err := s.repository.Membership.IsMember(ctx, tripID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errs.Forbidden()
	}
	return nil
}

func (s *PollService) toAPIResponse(poll *models.Poll, allVotes []models.PollVote, userVotes []models.PollVote) *models.PollAPIResponse {
	// Build vote count per option
	voteCounts := make(map[uuid.UUID]int)
	for _, v := range allVotes {
		voteCounts[v.OptionID]++
	}

	// Build set of user's voted option IDs
	userVotedOptions := make(map[uuid.UUID]bool)
	for _, v := range userVotes {
		userVotedOptions[v.OptionID] = true
	}

	options := make([]models.PollOptionAPIResponse, len(poll.Options))
	for i, opt := range poll.Options {
		options[i] = models.PollOptionAPIResponse{
			ID:         opt.ID,
			OptionType: opt.OptionType,
			EntityType: opt.EntityType,
			EntityID:   opt.EntityID,
			Name:       opt.Name,
			VoteCount:  voteCounts[opt.ID],
			Voted:      userVotedOptions[opt.ID],
		}
	}

	totalVoters := countUniqueVoters(allVotes)

	return &models.PollAPIResponse{
		ID:          poll.ID,
		TripID:      poll.TripID,
		CreatedBy:   poll.CreatedBy,
		Question:    poll.Question,
		PollType:    poll.PollType,
		CreatedAt:   poll.CreatedAt,
		Deadline:    poll.Deadline,
		Options:     options,
		TotalVoters: totalVoters,
	}
}

func countUniqueVoters(votes []models.PollVote) int {
	seen := make(map[uuid.UUID]struct{})
	for _, v := range votes {
		seen[v.UserID] = struct{}{}
	}
	return len(seen)
}