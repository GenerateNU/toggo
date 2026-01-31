package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/google/uuid"
)

type TripServiceInterface interface {
	CreateTrip(ctx context.Context, req models.CreateTripRequest) (*models.Trip, error)
	GetTrip(ctx context.Context, id uuid.UUID) (*models.Trip, error)
	GetAllTrips(ctx context.Context) ([]*models.Trip, error)
	GetTripsWithCursor(ctx context.Context, limit int, cursorToken string) (*models.TripCursorPageResult, error)
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

func (s *TripService) CreateTrip(ctx context.Context, req models.CreateTripRequest) (*models.Trip, error) {
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

	return s.Trip.Create(ctx, trip)
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

func (s *TripService) GetAllTrips(ctx context.Context) ([]*models.Trip, error) {
	return s.Trip.FindAll(ctx)
}

func (s *TripService) GetTripsWithCursor(ctx context.Context, limit int, cursorToken string) (*models.TripCursorPageResult, error) {
	var cursor *models.TripCursor
	if cursorToken != "" {
		var c models.TripCursor
		if err := decodeCursor(cursorToken, &c); err != nil {
			return nil, err
		}
		cursor = &c
	}

	trips, nextCursor, err := s.Trip.FindAllWithCursor(ctx, limit, cursor)
	if err != nil {
		return nil, err
	}

	result := &models.TripCursorPageResult{
		Items: trips,
		Limit: limit,
	}
	if nextCursor != nil {
		result.NextCursor = encodeCursor(nextCursor)
	}
	return result, nil
}

func encodeCursor(c *models.TripCursor) string {
	b, _ := json.Marshal(c)
	return base64.URLEncoding.EncodeToString(b)
}

func decodeCursor(token string, c *models.TripCursor) error {
	b, err := base64.URLEncoding.DecodeString(token)
	if err != nil {
		return errs.ErrInvalidCursor
	}
	if err := json.Unmarshal(b, c); err != nil {
		return errs.ErrInvalidCursor
	}
	return nil
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