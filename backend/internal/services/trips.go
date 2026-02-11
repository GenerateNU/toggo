package services

import (
	"context"
	"errors"
	"log"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/realtime"
	"toggo/internal/repository"
	"toggo/internal/utilities/pagination"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type TripServiceInterface interface {
	CreateTrip(ctx context.Context, creatorUserID uuid.UUID, req models.CreateTripRequest) (*models.Trip, error)
	GetTrip(ctx context.Context, id uuid.UUID) (*models.TripAPIResponse, error)
	GetTripsWithCursor(ctx context.Context, userID uuid.UUID, limit int, cursorToken string) (*models.TripCursorPageResult, error)
	UpdateTrip(ctx context.Context, tripID uuid.UUID, req models.UpdateTripRequest) (*models.Trip, error)
	DeleteTrip(ctx context.Context, userID, tripID uuid.UUID) error
}

var _ TripServiceInterface = (*TripService)(nil)

type TripService struct {
	*repository.Repository
	fileService FileServiceInterface
	publisher   realtime.EventPublisher
}

func NewTripService(repo *repository.Repository, fileService FileServiceInterface, publisher realtime.EventPublisher) TripServiceInterface {
	return &TripService{
		Repository:  repo,
		fileService: fileService,
		publisher:   publisher,
	}
}

func (s *TripService) CreateTrip(ctx context.Context, creatorUserID uuid.UUID, req models.CreateTripRequest) (*models.Trip, error) {
	// Validate business rules
	if req.Name == "" {
		return nil, errs.BadRequest(errors.New("trip name cannot be empty"))
	}

	if req.BudgetMin < 0 {
		return nil, errs.BadRequest(errors.New("budget minimum cannot be negative"))
	}

	if req.BudgetMax < req.BudgetMin {
		return nil, errs.BadRequest(errors.New("budget maximum must be greater than or equal to minimum"))
	}

	// Validate cover image ID exists if provided
	if req.CoverImageID != nil {
		_, err := s.Image.FindByID(ctx, *req.CoverImageID)
		if err != nil {
			if errors.Is(err, errs.ErrNotFound) {
				return nil, errs.BadRequest(errors.New("cover image not found"))
			}
			return nil, err
		}
	}

	// Create trip
	trip := &models.Trip{
		ID:           uuid.New(),
		Name:         req.Name,
		CoverImageID: req.CoverImageID,
		BudgetMin:    req.BudgetMin,
		BudgetMax:    req.BudgetMax,
	}

	// Use transaction to ensure trip creation, membership, and default categories are atomic
	var createdTrip *models.Trip
	err := s.Repository.GetDB().RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		// Create trip within transaction
		_, err := tx.NewInsert().
			Model(trip).
			Returning("*").
			Exec(ctx)
		if err != nil {
			return err
		}
		createdTrip = trip

		// Create membership within the same transaction
		membership := &models.Membership{
			UserID:    creatorUserID,
			TripID:    trip.ID,
			IsAdmin:   true,
			BudgetMin: req.BudgetMin,
			BudgetMax: req.BudgetMax,
		}

		_, err = tx.NewInsert().
			Model(membership).
			Returning("*").
			Exec(ctx)
		if err != nil {
			return err
		}

		// Create default categories within the same transaction
		defaultCategories := []string{"food", "lodging", "attraction", "transportation", "entertainment"}
		for _, categoryName := range defaultCategories {
			category := &models.Category{
				TripID: trip.ID,
				Name:   categoryName,
			}
			_, err = tx.NewInsert().
				Model(category).
				Exec(ctx)
			if err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Publish trip.created event
	if s.publisher != nil {
		event, err := realtime.NewEvent("trip.created", createdTrip.ID.String(), createdTrip)
		if err != nil {
			log.Printf("Failed to create trip.created event: %v", err)
		} else if err := s.publisher.Publish(ctx, event); err != nil {
			log.Printf("Failed to publish trip.created event: %v", err)
		}
	}

	return createdTrip, nil
}

func (s *TripService) GetTrip(ctx context.Context, id uuid.UUID) (*models.TripAPIResponse, error) {
	tripData, err := s.Trip.FindWithCoverImage(ctx, id)
	if err != nil {
		return nil, err
	}
	if tripData == nil {
		return nil, errs.ErrNotFound
	}

	return s.toAPIResponse(ctx, tripData)
}

func (s *TripService) GetTripsWithCursor(ctx context.Context, userID uuid.UUID, limit int, cursorToken string) (*models.TripCursorPageResult, error) {
	cursor, err := pagination.ParseCursor(cursorToken)
	if err != nil {
		return nil, err
	}

	tripsData, nextCursor, err := s.Trip.FindAllWithCursorAndCoverImage(ctx, userID, limit, cursor)
	if err != nil {
		return nil, err
	}

	fileURLMap := pagination.FetchFileURLs(ctx, s.fileService, tripsData, func(item *models.TripDatabaseResponse) *string {
		return item.CoverImageKey
	}, models.ImageSizeMedium)
	tripResponses := s.convertToAPITrips(tripsData, fileURLMap)

	return s.buildTripPageResult(tripResponses, nextCursor, limit)
}

func (s *TripService) convertToAPITrips(tripsData []*models.TripDatabaseResponse, fileURLMap map[string]string) []*models.TripAPIResponse {
	tripResponses := make([]*models.TripAPIResponse, 0, len(tripsData))
	for _, tripData := range tripsData {
		var coverImageURL *string
		if tripData.CoverImageKey != nil && *tripData.CoverImageKey != "" {
			if url, exists := fileURLMap[*tripData.CoverImageKey]; exists {
				coverImageURL = &url
			}
		}

		tripResponses = append(tripResponses, &models.TripAPIResponse{
			ID:            tripData.TripID,
			Name:          tripData.Name,
			CoverImageURL: coverImageURL,
			BudgetMin:     tripData.BudgetMin,
			BudgetMax:     tripData.BudgetMax,
			CreatedAt:     tripData.CreatedAt,
			UpdatedAt:     tripData.UpdatedAt,
		})
	}
	return tripResponses
}

func (s *TripService) buildTripPageResult(tripResponses []*models.TripAPIResponse, nextCursor *models.TripCursor, limit int) (*models.TripCursorPageResult, error) {
	result := &models.TripCursorPageResult{
		Items: tripResponses,
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

func (s *TripService) UpdateTrip(ctx context.Context, tripID uuid.UUID, req models.UpdateTripRequest) (*models.Trip, error) {
	// Validate business rules only if fields are provided
	if req.Name != nil && *req.Name == "" {
		return nil, errs.BadRequest(errors.New("trip name cannot be empty"))
	}

	if req.BudgetMin != nil && *req.BudgetMin < 0 {
		return nil, errs.BadRequest(errors.New("budget minimum cannot be negative"))
	}

	if req.BudgetMin != nil && req.BudgetMax != nil && *req.BudgetMax < *req.BudgetMin {
		return nil, errs.BadRequest(errors.New("budget maximum must be greater than or equal to minimum"))
	}

	trip, err := s.Trip.Update(ctx, tripID, &req)
	if err != nil {
		return nil, err
	}

	// Publish trip.updated event
	if s.publisher != nil {
		event, err := realtime.NewEvent("trip.updated", tripID.String(), trip)
		if err != nil {
			log.Printf("Failed to create trip.updated event: %v", err)
		} else if err := s.publisher.Publish(ctx, event); err != nil {
			log.Printf("Failed to publish trip.updated event: %v", err)
		}
	}

	return trip, nil
}

func (s *TripService) DeleteTrip(ctx context.Context, userID, tripID uuid.UUID) error {
	// Only admins can delete trips
	isAdmin, err := s.Membership.IsAdmin(ctx, tripID, userID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errs.Forbidden()
	}

	return s.Trip.Delete(ctx, tripID)
}

func (s *TripService) toAPIResponse(ctx context.Context, tripData *models.TripDatabaseResponse) (*models.TripAPIResponse, error) {
	var coverImageURL *string

	if tripData.CoverImageID != nil {
		fileResp, err := s.fileService.GetFile(ctx, *tripData.CoverImageID, models.ImageSizeMedium)
		if err == nil {
			coverImageURL = &fileResp.URL
		}
	}

	return &models.TripAPIResponse{
		ID:            tripData.TripID,
		Name:          tripData.Name,
		CoverImageURL: coverImageURL,
		BudgetMin:     tripData.BudgetMin,
		BudgetMax:     tripData.BudgetMax,
		CreatedAt:     tripData.CreatedAt,
		UpdatedAt:     tripData.UpdatedAt,
	}, nil
}
