package repository

import (
	"context"
	"database/sql"
	"errors"
	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type TripRepository interface {
	Create(ctx context.Context, trip *models.Trip) (*models.Trip, error)
	Find(ctx context.Context, id uuid.UUID) (*models.Trip, error)
	FindWithCoverImage(ctx context.Context, id uuid.UUID) (*models.TripDatabaseResponse, error)
	FindAllWithCursorAndCoverImage(ctx context.Context, userID uuid.UUID, limit int, cursor *models.TripCursor) ([]*models.TripDatabaseResponse, *models.TripCursor, error)
	FindAllWithCursor(ctx context.Context, userID uuid.UUID, limit int, cursor *models.TripCursor) ([]*models.Trip, *models.TripCursor, error)
	Update(ctx context.Context, id uuid.UUID, req *models.UpdateTripRequest) (*models.Trip, error)
	SetRankPollID(ctx context.Context, tripID, pollID uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
}

var _ TripRepository = (*tripRepository)(nil)

type tripRepository struct {
	db *bun.DB
}

func NewTripRepository(db *bun.DB) TripRepository {
	return &tripRepository{db: db}
}

// Create creates a new trip
func (r *tripRepository) Create(ctx context.Context, trip *models.Trip) (*models.Trip, error) {
	_, err := r.db.NewInsert().
		Model(trip).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return trip, nil
}

// Find retrieves a trip by ID
func (r *tripRepository) Find(ctx context.Context, id uuid.UUID) (*models.Trip, error) {
	trip := &models.Trip{}
	err := r.db.NewSelect().
		Model(trip).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return trip, nil
}

// FindWithCoverImage retrieves a trip by ID with cover image ID
func (r *tripRepository) FindWithCoverImage(ctx context.Context, id uuid.UUID) (*models.TripDatabaseResponse, error) {
	tripData := &models.TripDatabaseResponse{}
	err := r.db.NewSelect().
		TableExpr("trips AS t").
		ColumnExpr("t.id AS trip_id, t.name, t.budget_min, t.budget_max, t.currency, t.pitch_deadline, t.rank_poll_id, t.created_at, t.updated_at").
		ColumnExpr("t.cover_image").
		ColumnExpr("img.file_key AS cover_image_key").
		Join("LEFT JOIN images AS img ON t.cover_image IS NOT NULL AND img.image_id = t.cover_image AND img.size = ? AND img.status = ?", models.ImageSizeMedium, models.UploadStatusConfirmed).
		Where("t.id = ?", id).
		Scan(ctx, tripData)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return tripData, nil
}

// FindAllWithCursor retrieves trips a user belongs to after the given cursor (cursor nil = first page).
// Uses ORDER BY trip.created_at DESC, trip.id DESC. Fetches limit+1 to detect hasNext; returns
// next cursor from the last row when there are more results.
func (r *tripRepository) FindAllWithCursor(ctx context.Context, userID uuid.UUID, limit int, cursor *models.TripCursor) ([]*models.Trip, *models.TripCursor, error) {
	query := r.db.NewSelect().
		Model((*models.Trip)(nil)).
		Join("JOIN memberships AS m ON m.trip_id = trip.id").
		Where("m.user_id = ?", userID).
		OrderExpr("trip.created_at DESC, trip.id DESC").
		Limit(limit + 1)

	if cursor != nil {
		query = query.Where("(trip.created_at < ?) OR (trip.created_at = ? AND trip.id < ?)", cursor.CreatedAt, cursor.CreatedAt, cursor.ID)
	}

	var trips []*models.Trip
	if err := query.Scan(ctx, &trips); err != nil {
		return nil, nil, err
	}

	var nextCursor *models.TripCursor
	if len(trips) > limit {
		lastVisible := trips[limit-1]
		nextCursor = &models.TripCursor{CreatedAt: lastVisible.CreatedAt, ID: lastVisible.ID}
		trips = trips[:limit]
	}

	return trips, nextCursor, nil
}

// FindAllWithCursorAndCoverImage retrieves trips a user belongs to with cursor pagination and cover image IDs
func (r *tripRepository) FindAllWithCursorAndCoverImage(ctx context.Context, userID uuid.UUID, limit int, cursor *models.TripCursor) ([]*models.TripDatabaseResponse, *models.TripCursor, error) {
	query := r.db.NewSelect().
		TableExpr("trips AS t").
		ColumnExpr("t.id AS trip_id, t.name, t.budget_min, t.budget_max, t.currency, t.pitch_deadline, t.rank_poll_id, t.created_at, t.updated_at").
		ColumnExpr("t.cover_image").
		ColumnExpr("img.file_key AS cover_image_key").
		Join("JOIN memberships AS m ON m.trip_id = t.id").
		Join("LEFT JOIN images AS img ON t.cover_image IS NOT NULL AND img.image_id = t.cover_image AND img.size = ? AND img.status = ?", models.ImageSizeMedium, models.UploadStatusConfirmed).
		Where("m.user_id = ?", userID).
		OrderExpr("t.created_at DESC, t.id DESC").
		Limit(limit + 1)

	if cursor != nil {
		query = query.Where("(t.created_at < ?) OR (t.created_at = ? AND t.id < ?)", cursor.CreatedAt, cursor.CreatedAt, cursor.ID)
	}

	var tripsData []*models.TripDatabaseResponse
	if err := query.Scan(ctx, &tripsData); err != nil {
		return nil, nil, err
	}

	var nextCursor *models.TripCursor
	if len(tripsData) > limit {
		lastVisible := tripsData[limit]
		nextCursor = &models.TripCursor{CreatedAt: lastVisible.CreatedAt, ID: lastVisible.TripID}
		tripsData = tripsData[:limit]
	}

	return tripsData, nextCursor, nil
}

// Update modifies an existing trip
func (r *tripRepository) Update(ctx context.Context, id uuid.UUID, req *models.UpdateTripRequest) (*models.Trip, error) {
	updateQuery := r.db.NewUpdate().
		Model(&models.Trip{}).
		Where("id = ?", id)

	if req.Name != nil {
		updateQuery = updateQuery.Set("name = ?", *req.Name)
	}

	if req.BudgetMin != nil {
		updateQuery = updateQuery.Set("budget_min = ?", *req.BudgetMin)
	}

	if req.BudgetMax != nil {
		updateQuery = updateQuery.Set("budget_max = ?", *req.BudgetMax)
	}

	if req.Currency != nil {
		updateQuery = updateQuery.Set("currency = ?", *req.Currency)
	}

	if req.CoverImageID != nil {
		updateQuery = updateQuery.Set("cover_image = ?", *req.CoverImageID)
	}

	if req.PitchDeadline != nil {
		updateQuery = updateQuery.Set("pitch_deadline = ?", *req.PitchDeadline)
	}

	result, err := updateQuery.Exec(ctx)
	if err != nil {
		return nil, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}

	if rowsAffected == 0 {
		return nil, errs.ErrNotFound
	}

	updatedTrip := &models.Trip{}
	err = r.db.NewSelect().
		Model(updatedTrip).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return updatedTrip, nil
}

// SetRankPollID sets the rank_poll_id on a trip.
func (r *tripRepository) SetRankPollID(ctx context.Context, tripID, pollID uuid.UUID) error {
	_, err := r.db.NewUpdate().
		TableExpr("trips").
		Set("rank_poll_id = ?", pollID).
		Where("id = ?", tripID).
		Exec(ctx)
	return err
}

// Delete removes a trip (idempotent)
func (r *tripRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.NewDelete().
		Model((*models.Trip)(nil)).
		Where("id = ?", id).
		Exec(ctx)

	// Idempotent - don't error if already deleted
	return err
}
