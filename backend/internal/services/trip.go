package services

import (
	"context"
	"errors"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"
	"toggo/internal/utilities/pagination"

	"github.com/google/uuid"
)

type TripServiceInterface interface {
	CreateTrip(ctx context.Context, req models.CreateTripRequest, creatorUserID uuid.UUID) (*models.Trip, error)
	GetTrip(ctx context.Context, id uuid.UUID) (*models.Trip, error)
	GetTripsWithCursor(ctx context.Context, userID uuid.UUID, limit int, cursorToken string) (*models.TripCursorPageResult, error)
	UpdateTrip(ctx context.Context, id uuid.UUID, req models.UpdateTripRequest) (*models.Trip, error)
	DeleteTrip(ctx context.Context, id uuid.UUID) error
}

var _ TripServiceInterface = (*TripService)(nil)

type TripService struct {
	*repository.Repository
}

func NewTripService(repo *repository.Repository) TripServiceInterface {
	return &TripService{Repository: repo}
}

func (s *TripService) CreateTrip(ctx context.Context, req models.CreateTripRequest, creatorUserID uuid.UUID) (*models.Trip, error) {
	// Validate business rules
	if req.Name == "" {
		return nil, errors.New("trip name cannot be empty")
	}

	if req.BudgetMin < 0 {
		return nil, errors.New("budget minimum cannot be negative")
	}

	if req.BudgetMax < req.BudgetMin {
		return nil, errors.New("budget maximum must be greater than or equal to minimum")
	}

	// Create trip
	trip := &models.Trip{
		ID:        uuid.New(),
		Name:      req.Name,
		BudgetMin: req.BudgetMin,
		BudgetMax: req.BudgetMax,
	}

	createdTrip, err := s.Trip.Create(ctx, trip)
	if err != nil {
		return nil, err
	}

	// Automatically add creator as admin member
	membership := &models.Membership{
		UserID:    creatorUserID,
		TripID:    createdTrip.ID,
		IsAdmin:   true,
		BudgetMin: req.BudgetMin,
		BudgetMax: req.BudgetMax,
	}

	_, err = s.Membership.Create(ctx, membership)
	if err != nil {
		// If membership creation fails, return the trip anyway
		// The trip exists, just without automatic membership
		return createdTrip, nil
	}

	return createdTrip, nil
}

func (s *TripService) GetTrip(ctx context.Context, id uuid.UUID) (*models.Trip, error) {
	trip, err := s.Trip.Find(ctx, id)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, errs.ErrNotFound
	}
	return trip, nil
}

func (s *TripService) GetTripsWithCursor(ctx context.Context, userID uuid.UUID, limit int, cursorToken string) (*models.TripCursorPageResult, error) {
	var cursor *models.TripCursor
	if cursorToken != "" {
		decoded, err := pagination.DecodeTimeUUIDCursor(cursorToken)
		if err != nil {
			return nil, err
		}
		cursor = decoded
	}

	trips, nextCursor, err := s.Trip.FindAllWithCursor(ctx, userID, limit, cursor)
	if err != nil {
		return nil, err
	}
	result := &models.TripCursorPageResult{
		Items: trips,
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

func (s *TripService) UpdateTrip(ctx context.Context, id uuid.UUID, req models.UpdateTripRequest) (*models.Trip, error) {
	// Validate business rules only if fields are provided
	if req.Name != nil && *req.Name == "" {
		return nil, errors.New("trip name cannot be empty")
	}

	if req.BudgetMin != nil && *req.BudgetMin < 0 {
		return nil, errors.New("budget minimum cannot be negative")
	}

	if req.BudgetMin != nil && req.BudgetMax != nil && *req.BudgetMax < *req.BudgetMin {
		return nil, errors.New("budget maximum must be greater than or equal to minimum")
	}

	return s.Trip.Update(ctx, id, &req)
}

func (s *TripService) DeleteTrip(ctx context.Context, id uuid.UUID) error {
	return s.Trip.Delete(ctx, id)
}
