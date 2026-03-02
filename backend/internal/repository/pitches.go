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

var _ PitchRepository = (*pitchRepository)(nil)

type pitchRepository struct {
	db *bun.DB
}

// Create inserts a new trip pitch and returns it (with ID and timestamps set).
func (r *pitchRepository) Create(ctx context.Context, pitch *models.TripPitch) (*models.TripPitch, error) {
	_, err := r.db.NewInsert().
		Model(pitch).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return pitch, nil
}

// CreateWithImages inserts a pitch and its initial image associations in a single transaction.
func (r *pitchRepository) CreateWithImages(ctx context.Context, pitch *models.TripPitch, imageIDs []uuid.UUID) (*models.TripPitch, error) {
	err := r.db.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewInsert().Model(pitch).Returning("*").Exec(ctx); err != nil {
			return err
		}
		if len(imageIDs) == 0 {
			return nil
		}
		rows := make([]models.PitchImage, len(imageIDs))
		for i, id := range imageIDs {
			rows[i] = models.PitchImage{PitchID: pitch.ID, ImageID: id}
		}
		_, err := tx.NewInsert().Model(&rows).Exec(ctx)
		return err
	})
	if err != nil {
		return nil, err
	}
	return pitch, nil
}

// FindByIDAndTripID fetches a pitch by id and trip_id (ensures the pitch belongs to the trip).
func (r *pitchRepository) FindByIDAndTripID(ctx context.Context, id, tripID uuid.UUID) (*models.TripPitch, error) {
	pitch := &models.TripPitch{}
	err := r.db.NewSelect().
		Model(pitch).
		Where("id = ? AND trip_id = ?", id, tripID).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return pitch, nil
}

// FindByTripIDWithCursor returns pitches for a trip with cursor-based pagination (created_at DESC, id DESC).
func (r *pitchRepository) FindByTripIDWithCursor(ctx context.Context, tripID uuid.UUID, limit int, cursor *models.PitchCursor) ([]*models.TripPitch, *models.PitchCursor, error) {
	query := r.db.NewSelect().
		Model((*models.TripPitch)(nil)).
		Where("trip_id = ?", tripID).
		OrderExpr("created_at DESC, id DESC").
		Limit(limit + 1)

	if cursor != nil {
		query = query.Where("(created_at, id) < (?, ?)", cursor.CreatedAt, cursor.ID)
	}

	var pitches []*models.TripPitch
	if err := query.Scan(ctx, &pitches); err != nil {
		return nil, nil, err
	}

	var nextCursor *models.PitchCursor
	if len(pitches) > limit {
		last := pitches[limit-1]
		nextCursor = &models.PitchCursor{CreatedAt: last.CreatedAt, ID: last.ID}
		pitches = pitches[:limit]
	}

	return pitches, nextCursor, nil
}

// Update applies partial updates to a pitch (only non-nil fields). Pitch must belong to the given trip.
func (r *pitchRepository) Update(ctx context.Context, id, tripID uuid.UUID, req *models.UpdatePitchRequest) (*models.TripPitch, error) {
	upd := r.db.NewUpdate().
		Model((*models.TripPitch)(nil)).
		Where("id = ? AND trip_id = ?", id, tripID)

	if req.Title != nil {
		upd = upd.Set("title = ?", *req.Title)
	}
	if req.Description != nil {
		upd = upd.Set("description = ?", *req.Description)
	}
	if req.Duration != nil {
		upd = upd.Set("duration = ?", *req.Duration)
	}

	result, err := upd.Exec(ctx)
	if err != nil {
		return nil, err
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return nil, errs.ErrNotFound
	}

	pitch := &models.TripPitch{}
	err = r.db.NewSelect().
		Model(pitch).
		Where("id = ? AND trip_id = ?", id, tripID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return pitch, nil
}

// Delete removes a pitch by id and trip_id. Returns ErrNotFound if no row was deleted.
func (r *pitchRepository) Delete(ctx context.Context, id, tripID uuid.UUID) error {
	result, err := r.db.NewDelete().
		Model((*models.TripPitch)(nil)).
		Where("id = ? AND trip_id = ?", id, tripID).
		Exec(ctx)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errs.ErrNotFound
	}
	return nil
}

// SetImages fully replaces the image associations for a pitch in a single transaction.
// Passing an empty slice removes all associations.
func (r *pitchRepository) SetImages(ctx context.Context, pitchID uuid.UUID, imageIDs []uuid.UUID) error {
	return r.db.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewDelete().
			TableExpr("pitch_images").
			Where("pitch_id = ?", pitchID).
			Exec(ctx); err != nil {
			return err
		}
		if len(imageIDs) == 0 {
			return nil
		}
		rows := make([]models.PitchImage, len(imageIDs))
		for i, id := range imageIDs {
			rows[i] = models.PitchImage{PitchID: pitchID, ImageID: id}
		}
		_, err := tx.NewInsert().Model(&rows).Exec(ctx)
		return err
	})
}

// GetImageIDsForPitch returns the image IDs associated with a single pitch.
func (r *pitchRepository) GetImageIDsForPitch(ctx context.Context, pitchID uuid.UUID) ([]uuid.UUID, error) {
	var rows []models.PitchImage
	err := r.db.NewSelect().
		Model(&rows).
		Where("pitch_id = ?", pitchID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	ids := make([]uuid.UUID, len(rows))
	for i, row := range rows {
		ids[i] = row.ImageID
	}
	return ids, nil
}

// GetImageIDsForPitches batch-loads image IDs for multiple pitches to avoid N+1 queries.
func (r *pitchRepository) GetImageIDsForPitches(ctx context.Context, pitchIDs []uuid.UUID) (map[uuid.UUID][]uuid.UUID, error) {
	result := make(map[uuid.UUID][]uuid.UUID, len(pitchIDs))
	if len(pitchIDs) == 0 {
		return result, nil
	}
	var rows []models.PitchImage
	err := r.db.NewSelect().
		Model(&rows).
		Where("pitch_id IN (?)", bun.In(pitchIDs)).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		result[row.PitchID] = append(result[row.PitchID], row.ImageID)
	}
	return result, nil
}
