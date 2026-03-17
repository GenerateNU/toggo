package services

import (
	"context"
	"errors"
	"time"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/google/uuid"
)

const (
	TabTypeHome      = "home"
	TabTypeItinerary = "itinerary"
	TabTypeBudget    = "budget"
	TabTypeMoodboard = "moodboard"
	TabTypeBlank     = "blank"
)

var fixedTabTypes = map[string]bool{
	TabTypeHome:      true,
	TabTypeItinerary: true,
	TabTypeBudget:    true,
}

var validTabTypes = map[string]bool{
	TabTypeHome:      true,
	TabTypeItinerary: true,
	TabTypeBudget:    true,
	TabTypeMoodboard: true,
	TabTypeBlank:     true,
}

type TripTabServiceInterface interface {
	GetTabs(ctx context.Context, tripID, userID uuid.UUID) ([]*models.TripTab, error)
	CreateTab(ctx context.Context, tripID, userID uuid.UUID, req models.CreateTripTabRequest) (*models.TripTab, error)
	ReorderTabs(ctx context.Context, tripID, userID uuid.UUID, req models.UpdateTripTabOrderRequest) error
	DeleteTab(ctx context.Context, tripID, tabID, userID uuid.UUID) error
}

var _ TripTabServiceInterface = (*TripTabService)(nil)

type TripTabService struct {
	*repository.Repository
}

func NewTripTabService(repo *repository.Repository) TripTabServiceInterface {
	return &TripTabService{Repository: repo}
}

// GetTabs returns all tabs for a trip ordered by position
func (s *TripTabService) GetTabs(ctx context.Context, tripID, userID uuid.UUID) ([]*models.TripTab, error) {
	isMember, err := s.Membership.IsMember(ctx, tripID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errs.Forbidden()
	}

	return s.TripTab.FindByTripID(ctx, tripID)
}

// CreateTab adds a new customizable tab to a trip
func (s *TripTabService) CreateTab(ctx context.Context, tripID, userID uuid.UUID, req models.CreateTripTabRequest) (*models.TripTab, error) {
	isMember, err := s.Membership.IsMember(ctx, tripID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errs.Forbidden()
	}

	if !validTabTypes[req.TabType] {
		return nil, errs.BadRequest(errors.New("invalid tab type"))
	}

	if fixedTabTypes[req.TabType] {
		return nil, errs.BadRequest(errors.New("cannot create a fixed tab"))
	}

	// Position new tab at MAX(position)+1 to avoid constraint violations after deletions
	tabs, err := s.TripTab.FindByTripID(ctx, tripID)
	if err != nil {
		return nil, err
	}

	nextPosition := 0
	for _, t := range tabs {
		if t.Position >= nextPosition {
			nextPosition = t.Position + 1
		}
	}

	tab := &models.TripTab{
		ID:        uuid.New(),
		TripID:    tripID,
		TabType:   req.TabType,
		Name:      req.Name,
		Position:  nextPosition,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	return s.TripTab.Create(ctx, tab)
}

// ReorderTabs updates the position of all tabs in a trip
func (s *TripTabService) ReorderTabs(ctx context.Context, tripID, userID uuid.UUID, req models.UpdateTripTabOrderRequest) error {
	isMember, err := s.Membership.IsMember(ctx, tripID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errs.Forbidden()
	}

	// Fetch current tabs and validate the request is a full one-to-one mapping
	currentTabs, err := s.TripTab.FindByTripID(ctx, tripID)
	if err != nil {
		return err
	}

	if len(req.Tabs) != len(currentTabs) {
		return errs.BadRequest(errors.New("reorder request must include all tabs exactly once"))
	}

	currentIDs := make(map[uuid.UUID]bool)
	for _, t := range currentTabs {
		currentIDs[t.ID] = true
	}

	// Ensure no duplicate positions and all IDs belong to this trip
	seen := make(map[int]bool)
	seenIDs := make(map[uuid.UUID]bool)
	for _, t := range req.Tabs {
		if !currentIDs[t.ID] {
			return errs.BadRequest(errors.New("tab does not belong to this trip"))
		}
		if seenIDs[t.ID] {
			return errs.BadRequest(errors.New("duplicate tab IDs in reorder request"))
		}
		if seen[t.Position] {
			return errs.BadRequest(errors.New("duplicate positions in reorder request"))
		}
		seen[t.Position] = true
		seenIDs[t.ID] = true
	}

	return s.TripTab.UpdateOrder(ctx, tripID, req.Tabs)
}

// DeleteTab removes a customizable tab from a trip
func (s *TripTabService) DeleteTab(ctx context.Context, tripID, tabID, userID uuid.UUID) error {
	isMember, err := s.Membership.IsMember(ctx, tripID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errs.Forbidden()
	}

	// Prevent deleting fixed tabs
	tabs, err := s.TripTab.FindByTripID(ctx, tripID)
	if err != nil {
		return err
	}

	for _, t := range tabs {
		if t.ID == tabID {
			if fixedTabTypes[t.TabType] {
				return errs.BadRequest(errors.New("cannot delete a fixed tab"))
			}
			return s.TripTab.Delete(ctx, tabID, tripID)
		}
	}

	return errs.ErrNotFound
}