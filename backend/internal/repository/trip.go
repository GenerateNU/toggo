package repository

import (
	"context"
	"database/sql"
	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

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
		if err == sql.ErrNoRows {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return trip, nil
}

// FindAllWithCursor retrieves trips after the given cursor (cursor nil = first page).
// Uses ORDER BY created_at DESC, id DESC. Fetches limit+1 to detect hasNext; returns
// next cursor from the last row when there are more results.
func (r *tripRepository) FindAllWithCursor(ctx context.Context, limit int, cursor *models.TripCursor) ([]*models.Trip, *models.TripCursor, error) {
	query := r.db.NewSelect().
		Model((*models.Trip)(nil)).
		Order("created_at DESC", "id DESC").
		Limit(limit + 1)

	if cursor != nil {
		query = query.Where("(created_at, id) < (?, ?)", cursor.CreatedAt, cursor.ID)
	}

	var trips []*models.Trip
	if err := query.Scan(ctx, &trips); err != nil {
		return nil, nil, err
	}

	var nextCursor *models.TripCursor
	if len(trips) > limit {
		last := trips[limit]
		nextCursor = &models.TripCursor{CreatedAt: last.CreatedAt, ID: last.ID}
		trips = trips[:limit]
	}

	return trips, nextCursor, nil
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

// Delete removes a trip (idempotent)
func (r *tripRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.NewDelete().
		Model((*models.Trip)(nil)).
		Where("id = ?", id).
		Exec(ctx)

	// Idempotent - don't error if already deleted
	return err
}
