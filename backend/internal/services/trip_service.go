package services

import (
	"context"
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

func (s *TripService) UpdateTrip(ctx context.Context, id uuid.UUID, req models.UpdateTripRequest) (*models.Trip, error) {
	// Check if trip exists
	_, err := s.Trip.Find(ctx, id)
	if err != nil {
		return nil, err
	}

	// Validate business rules
	if req.Name != nil && *req.Name == "" {
		return nil, errors.New("trip name cannot be empty")
	}

	if req.BudgetMin < 0 {
		return nil, errors.New("budget minimum cannot be negative")
	}

	if req.BudgetMax < req.BudgetMin {
		return nil, errors.New("budget maximum must be greater than or equal to minimum")
	}

	return s.Trip.Update(ctx, id, &req)
}

func (s *TripService) DeleteTrip(ctx context.Context, id uuid.UUID) error {
	return s.Trip.Delete(ctx, id)
}