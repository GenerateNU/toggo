package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"
	"toggo/internal/constants"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/realtime"
	"toggo/internal/repository"

	"github.com/google/uuid"
)

type RankPollServiceInterface interface {
	CreateRankPoll(ctx context.Context, tripID uuid.UUID, userID uuid.UUID, req models.CreatePollRequest) (*models.RankPollAPIResponse, error)
	UpdateRankPoll(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, userID uuid.UUID, req models.UpdatePollRequest) (*models.RankPollAPIResponse, error)
	AddPollOption(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, userID uuid.UUID, req models.CreatePollOptionRequest) (*models.PollOptionAPIResponse, error)
	DeletePollOption(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, optionID uuid.UUID, userID uuid.UUID) (*models.PollOptionAPIResponse, error)
	SubmitRanking(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, userID uuid.UUID, req models.SubmitRankingRequest) error
	GetRankPollResults(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, userID uuid.UUID) (*models.RankPollResultsResponse, error)
	GetPollVoters(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, userID uuid.UUID) (*models.PollVotersResponse, error)
	DeleteRankPoll(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, userID uuid.UUID) (*models.RankPollAPIResponse, error)
}

var _ RankPollServiceInterface = (*RankPollService)(nil)

type RankPollService struct {
	repository *repository.Repository
	publisher  realtime.EventPublisher
}

func NewRankPollService(repo *repository.Repository, publisher realtime.EventPublisher) RankPollServiceInterface {
	return &RankPollService{
		repository: repo,
		publisher:  publisher,
	}
}

func (s *RankPollService) CreateRankPoll(ctx context.Context, tripID uuid.UUID, userID uuid.UUID, req models.CreatePollRequest) (*models.RankPollAPIResponse, error) {
	if req.Deadline != nil && time.Now().UTC().After(*req.Deadline) {
		return nil, errs.BadRequest(errors.New("deadline must be in the future"))
	}

	if len(req.Options) < constants.MinPollOptions {
		return nil, errs.BadRequest(errors.New("rank polls must have at least 2 options"))
	}

	if len(req.Options) > constants.MaxPollOptions {
		return nil, errs.BadRequest(errors.New("a poll cannot have more than 15 options"))
	}

	poll := &models.Poll{
		ID:        uuid.New(),
		TripID:    tripID,
		CreatedBy: userID,
		Question:  req.Question,
		PollType:  models.PollTypeRank,
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

	resp := s.toRankPollAPIResponse(created)
	s.publishEvent(ctx, "poll.created", tripID.String(), created)

	return resp, nil
}

func (s *RankPollService) UpdateRankPoll(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, userID uuid.UUID, req models.UpdatePollRequest) (*models.RankPollAPIResponse, error) {
	poll, err := s.validateRankPollAccess(ctx, tripID, pollID, userID)
	if err != nil {
		return nil, err
	}

	if poll.CreatedBy != userID {
		return nil, errs.Forbidden()
	}

	if poll.IsDeadlinePassed() {
		return nil, errs.BadRequest(errors.New("cannot update poll after the deadline has passed"))
	}

	if req.Deadline != nil && time.Now().UTC().After(*req.Deadline) {
		return nil, errs.BadRequest(errors.New("deadline must be in the future"))
	}

	if req.Question == nil && req.Deadline == nil {
		return nil, errs.BadRequest(errors.New("at least one field must be provided"))
	}

	updated, err := s.repository.Poll.UpdatePoll(ctx, pollID, &req)
	if err != nil {
		return nil, err
	}

	resp := s.toRankPollAPIResponse(updated)
	s.publishEvent(ctx, "poll.updated", tripID.String(), updated)

	return resp, nil
}

func (s *RankPollService) AddPollOption(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, userID uuid.UUID, req models.CreatePollOptionRequest) (*models.PollOptionAPIResponse, error) {
	poll, err := s.validateRankPollAccess(ctx, tripID, pollID, userID)
	if err != nil {
		return nil, err
	}

	if poll.CreatedBy != userID {
		return nil, errs.Forbidden()
	}

	if poll.IsDeadlinePassed() {
		return nil, errs.BadRequest(errors.New("cannot add options after the poll deadline has passed"))
	}

	hasRankings, err := s.repository.PollRanking.HasAnyRankings(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if hasRankings {
		return nil, errs.BadRequest(errors.New("cannot add options after rankings have been submitted"))
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
	if err != nil {
		return nil, err
	}
	return s.toPollOptionAPIResponse(result), nil
}

func (s *RankPollService) DeletePollOption(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, optionID uuid.UUID, userID uuid.UUID) (*models.PollOptionAPIResponse, error) {
	poll, err := s.validateRankPollAccess(ctx, tripID, pollID, userID)
	if err != nil {
		return nil, err
	}

	if poll.CreatedBy != userID {
		return nil, errs.Forbidden()
	}

	if poll.IsDeadlinePassed() {
		return nil, errs.BadRequest(errors.New("cannot delete options after the poll deadline has passed"))
	}

	hasRankings, err := s.repository.PollRanking.HasAnyRankings(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if hasRankings {
		return nil, errs.BadRequest(errors.New("cannot delete options after rankings have been submitted"))
	}

	result, err := s.repository.Poll.DeleteOption(ctx, pollID, optionID, constants.MinPollOptions)
	if errors.Is(err, errs.ErrMinOptionsRequired) {
		return nil, errs.BadRequest(errors.New("a poll must have at least 2 options"))
	}
	if err != nil {
		return nil, err
	}
	return s.toPollOptionAPIResponse(result), nil
}

func (s *RankPollService) SubmitRanking(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, userID uuid.UUID, req models.SubmitRankingRequest) error {
	poll, err := s.validateRankPollAccess(ctx, tripID, pollID, userID)
	if err != nil {
		return err
	}

	if poll.IsDeadlinePassed() {
		return errs.BadRequest(errors.New("cannot submit ranking after deadline"))
	}

	options, err := s.repository.Poll.FindPollByID(ctx, pollID)
	if err != nil {
		return err
	}

	if err := s.validateRanking(req.Rankings, options.Options); err != nil {
		return err
	}

	if err := s.repository.PollRanking.SubmitRanking(ctx, pollID, userID, req.Rankings); err != nil {
		return err
	}

	results, totalVoters := s.getResultsForEvent(ctx, pollID)

	s.publishEvent(ctx, "poll.ranking_submitted", tripID.String(), map[string]interface{}{
		"poll_id":      pollID.String(),
		"user_id":      userID.String(),
		"total_voters": totalVoters,
		"top_3":        results,
	})

	return nil
}

func (s *RankPollService) GetRankPollResults(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, userID uuid.UUID) (*models.RankPollResultsResponse, error) {
	poll, err := s.validateRankPollAccess(ctx, tripID, pollID, userID)
	if err != nil {
		return nil, err
	}

	allOptions, err := s.repository.PollRanking.GetAggregatedResults(ctx, pollID)
	if err != nil {
		return nil, err
	}

	top3 := allOptions
	if len(top3) > 3 {
		top3 = allOptions[:3]
	}

	userRankingItems, err := s.getUserRankingItems(ctx, pollID, userID, allOptions)
	if err != nil {
		return nil, err
	}

	totalVoters, totalMembers, err := s.getVoterCounts(ctx, pollID, tripID)
	if err != nil {
		return nil, err
	}

	return &models.RankPollResultsResponse{
		PollID:       poll.ID,
		Question:     poll.Question,
		PollType:     poll.PollType,
		Deadline:     poll.Deadline,
		CreatedBy:    poll.CreatedBy,
		CreatedAt:    poll.CreatedAt,
		TotalVoters:  totalVoters,
		TotalMembers: totalMembers,
		Top3:         top3,
		AllOptions:   allOptions,
		UserRanking:  userRankingItems,
		UserHasVoted: len(userRankingItems) > 0,
	}, nil
}

func (s *RankPollService) GetPollVoters(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, userID uuid.UUID) (*models.PollVotersResponse, error) {
	if _, err := s.validateRankPollAccess(ctx, tripID, pollID, userID); err != nil {
		return nil, err
	}

	voters, err := s.repository.PollRanking.GetVoterStatus(ctx, pollID, tripID)
	if err != nil {
		return nil, err
	}

	totalVoters := 0
	for _, voter := range voters {
		if voter.HasVoted {
			totalVoters++
		}
	}

	return &models.PollVotersResponse{
		PollID:       pollID,
		TotalMembers: len(voters),
		TotalVoters:  totalVoters,
		Voters:       voters,
	}, nil
}

func (s *RankPollService) DeleteRankPoll(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, userID uuid.UUID) (*models.RankPollAPIResponse, error) {
	poll, err := s.repository.Poll.FindPollMetaByID(ctx, pollID)
	if err != nil {
		return nil, err
	}

	if poll.TripID != tripID {
		return nil, errs.ErrNotFound
	}

	if poll.PollType != models.PollTypeRank {
		return nil, errs.BadRequest(errors.New("not a rank poll"))
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

	deleted, err := s.repository.Poll.DeletePoll(ctx, pollID)
	if err != nil {
		return nil, err
	}

	resp := s.toRankPollAPIResponse(deleted)
	s.publishEvent(ctx, "poll.deleted", tripID.String(), deleted)

	return resp, nil
}

// helpers :)

func (s *RankPollService) validateRankPollAccess(ctx context.Context, tripID uuid.UUID, pollID uuid.UUID, userID uuid.UUID) (*models.Poll, error) {
	poll, err := s.repository.Poll.FindPollMetaByID(ctx, pollID)
	if err != nil {
		return nil, err
	}

	if poll.TripID != tripID {
		return nil, errs.ErrNotFound
	}

	if poll.PollType != models.PollTypeRank {
		return nil, errs.BadRequest(errors.New("not a rank poll"))
	}

	return poll, nil
}

func (s *RankPollService) validateRanking(rankings []models.RankingItem, options []models.PollOption) error {
	if len(rankings) != len(options) {
		return errs.BadRequest(fmt.Errorf("must rank all %d options", len(options)))
	}

	validOptionIDs := make(map[uuid.UUID]bool)
	for _, opt := range options {
		validOptionIDs[opt.ID] = true
	}

	usedRanks := make(map[int]bool)
	usedOptions := make(map[uuid.UUID]bool)

	for _, ranking := range rankings {
		if !validOptionIDs[ranking.OptionID] {
			return errs.BadRequest(fmt.Errorf("invalid option_id: %s", ranking.OptionID))
		}

		if usedOptions[ranking.OptionID] {
			return errs.BadRequest(fmt.Errorf("duplicate option_id: %s", ranking.OptionID))
		}
		usedOptions[ranking.OptionID] = true

		if ranking.Rank < 1 || ranking.Rank > len(options) {
			return errs.BadRequest(fmt.Errorf("rank must be between 1 and %d", len(options)))
		}

		if usedRanks[ranking.Rank] {
			return errs.BadRequest(fmt.Errorf("duplicate rank position: %d", ranking.Rank))
		}
		usedRanks[ranking.Rank] = true
	}

	for i := 1; i <= len(options); i++ {
		if !usedRanks[i] {
			return errs.BadRequest(fmt.Errorf("missing rank position: %d", i))
		}
	}

	return nil
}

func (s *RankPollService) getUserRankingItems(ctx context.Context, pollID uuid.UUID, userID uuid.UUID, allOptions []models.OptionWithScore) ([]models.UserRankingItem, error) {
	userRankings, err := s.repository.PollRanking.FindByPollAndUser(ctx, pollID, userID)
	if err != nil {
		return nil, err
	}

	optionMap := make(map[uuid.UUID]string)
	for _, opt := range allOptions {
		optionMap[opt.OptionID] = opt.Name
	}

	userRankingItems := make([]models.UserRankingItem, 0, len(userRankings))
	for _, ranking := range userRankings {
		userRankingItems = append(userRankingItems, models.UserRankingItem{
			OptionID:     ranking.OptionID,
			OptionName:   optionMap[ranking.OptionID],
			RankPosition: ranking.RankPosition,
		})
	}

	return userRankingItems, nil
}

func (s *RankPollService) getVoterCounts(ctx context.Context, pollID uuid.UUID, tripID uuid.UUID) (int, int, error) {
	allRankings, err := s.repository.PollRanking.FindByPollID(ctx, pollID)
	if err != nil {
		return 0, 0, err
	}

	uniqueVoters := make(map[uuid.UUID]bool)
	for _, ranking := range allRankings {
		uniqueVoters[ranking.UserID] = true
	}

	totalMembers, err := s.repository.Membership.CountMembers(ctx, tripID)
	if err != nil {
		return 0, 0, err
	}

	return len(uniqueVoters), totalMembers, nil
}

func (s *RankPollService) getResultsForEvent(ctx context.Context, pollID uuid.UUID) ([]models.OptionWithScore, int) {
	results, err := s.repository.PollRanking.GetAggregatedResults(ctx, pollID)
	if err != nil {
		log.Printf("Failed to get results for event: %v", err)
		return []models.OptionWithScore{}, 0
	}

	top3 := results
	if len(top3) > 3 {
		top3 = results[:3]
	}

	allRankings, err := s.repository.PollRanking.FindByPollID(ctx, pollID)
	if err != nil {
		log.Printf("Failed to get rankings for event: %v", err)
		return top3, 0
	}

	uniqueVoters := make(map[uuid.UUID]bool)
	for _, ranking := range allRankings {
		uniqueVoters[ranking.UserID] = true
	}

	return top3, len(uniqueVoters)
}

func (s *RankPollService) publishEvent(ctx context.Context, topic, tripID string, data interface{}) {
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

func (s *RankPollService) toRankPollAPIResponse(poll *models.Poll) *models.RankPollAPIResponse {
	options := make([]models.PollOptionAPIResponse, len(poll.Options))
	for i, opt := range poll.Options {
		options[i] = *s.toPollOptionAPIResponse(&opt)
	}

	return &models.RankPollAPIResponse{
		ID:        poll.ID,
		TripID:    poll.TripID,
		CreatedBy: poll.CreatedBy,
		Question:  poll.Question,
		PollType:  poll.PollType,
		Deadline:  poll.Deadline,
		CreatedAt: poll.CreatedAt,
		Options:   options,
	}
}

func (s *RankPollService) toPollOptionAPIResponse(option *models.PollOption) *models.PollOptionAPIResponse {
	return &models.PollOptionAPIResponse{
		ID:         option.ID,
		OptionType: option.OptionType,
		EntityType: option.EntityType,
		EntityID:   option.EntityID,
		Name:       option.Name,
	}
}
