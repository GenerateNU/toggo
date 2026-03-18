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

type PitchRepository interface {
	Create(ctx context.Context, pitch *models.TripPitch) (*models.TripPitch, error)
	CreateWithImages(ctx context.Context, pitch *models.TripPitch, imageIDs []uuid.UUID) (*models.TripPitch, error)
	FindByIDAndTripID(ctx context.Context, id, tripID uuid.UUID) (*models.TripPitch, error)
	FindByTripIDWithCursor(ctx context.Context, tripID uuid.UUID, limit int, cursor *models.PitchCursor) ([]*models.TripPitch, *models.PitchCursor, error)
	Update(ctx context.Context, id, tripID uuid.UUID, req *models.UpdatePitchRequest) (*models.TripPitch, error)
	UpdateWithImages(ctx context.Context, id, tripID uuid.UUID, req *models.UpdatePitchRequest, imageIDs []uuid.UUID) (*models.TripPitch, error)
	Delete(ctx context.Context, id, tripID uuid.UUID) error

	SetImages(ctx context.Context, pitchID uuid.UUID, imageIDs []uuid.UUID) error
	GetImageIDsForPitch(ctx context.Context, pitchID uuid.UUID) ([]uuid.UUID, error)
	GetImageIDsForPitches(ctx context.Context, pitchIDs []uuid.UUID) (map[uuid.UUID][]uuid.UUID, error)
	GetImageKeysForPitch(ctx context.Context, pitchID uuid.UUID) ([]string, error)
	GetImageKeysForPitches(ctx context.Context, pitchIDs []uuid.UUID) (map[uuid.UUID][]string, error)
}

var _ PitchRepository = (*pitchRepository)(nil)

type pitchRepository struct {
	db *bun.DB
}

func NewPitchRepository(db *bun.DB) PitchRepository {
	return &pitchRepository{db: db}
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
		if len(imageIDs) == 0 {
			_, err := tx.NewDelete().
				TableExpr("pitch_images").
				Where("pitch_id = ?", pitchID).
				Exec(ctx)
			return err
		}
		rows := make([]models.PitchImage, len(imageIDs))
		for i, id := range imageIDs {
			rows[i] = models.PitchImage{PitchID: pitchID, ImageID: id}
		}
		_, err := tx.NewInsert().
			Model(&rows).
			On("CONFLICT (pitch_id, image_id) DO NOTHING").
			Exec(ctx)
		return err
	})
}

// UpdateWithImages atomically updates pitch metadata and merges image associations
// in a single transaction. Empty imageIDs removes all associations; non-empty
// imageIDs adds missing ones via tx.NewInsert() without removing existing pitch_images rows.
func (r *pitchRepository) UpdateWithImages(ctx context.Context, id, tripID uuid.UUID, req *models.UpdatePitchRequest, imageIDs []uuid.UUID) (*models.TripPitch, error) {
	var result models.TripPitch
	err := r.db.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		// Update metadata only when at least one field is provided.
		if req.Title != nil || req.Description != nil || req.Duration != nil {
			upd := tx.NewUpdate().
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
			res, err := upd.Exec(ctx)
			if err != nil {
				return err
			}
			if n, _ := res.RowsAffected(); n == 0 {
				return errs.ErrNotFound
			}
		}
		// Merge image associations inside the same transaction.
		if len(imageIDs) == 0 {
			if _, err := tx.NewDelete().
				TableExpr("pitch_images").
				Where("pitch_id = ?", id).
				Exec(ctx); err != nil {
				return err
			}
		} else {
			imgRows := make([]models.PitchImage, len(imageIDs))
			for i, imgID := range imageIDs {
				imgRows[i] = models.PitchImage{PitchID: id, ImageID: imgID}
			}
			if _, err := tx.NewInsert().
				Model(&imgRows).
				On("CONFLICT (pitch_id, image_id) DO NOTHING").
				Exec(ctx); err != nil {
				return err
			}
		}
		// Read back the updated pitch within the same transaction.
		return tx.NewSelect().
			Model(&result).
			Where("id = ? AND trip_id = ?", id, tripID).
			Scan(ctx)
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return &result, nil
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

// GetImageKeysForPitch returns the S3 file keys associated with a single pitch.
func (r *pitchRepository) GetImageKeysForPitch(ctx context.Context, pitchID uuid.UUID) ([]string, error) {
	var keys []string
	err := r.db.NewSelect().
		TableExpr("pitch_images pi").
		Join("INNER JOIN images i ON i.image_id = pi.image_id").
		ColumnExpr("i.file_key").
		Where("pi.pitch_id = ?", pitchID).
		Where("i.status = ?", "confirmed").
		Scan(ctx, &keys)
	if err != nil {
		return nil, err
	}
	return keys, nil
}

// GetImageKeysForPitches batch-loads S3 file keys for multiple pitches to avoid N+1 queries.
func (r *pitchRepository) GetImageKeysForPitches(ctx context.Context, pitchIDs []uuid.UUID) (map[uuid.UUID][]string, error) {
	result := make(map[uuid.UUID][]string, len(pitchIDs))
	if len(pitchIDs) == 0 {
		return result, nil
	}
	type row struct {
		PitchID uuid.UUID `bun:"pitch_id"`
		FileKey string    `bun:"file_key"`
	}
	var rows []row
	err := r.db.NewSelect().
		TableExpr("pitch_images pi").
		Join("INNER JOIN images i ON i.image_id = pi.image_id").
		ColumnExpr("pi.pitch_id, i.file_key").
		Where("pi.pitch_id IN (?)", bun.In(pitchIDs)).
		Where("i.status = ?", "confirmed").
		Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}
	for _, r := range rows {
		result[r.PitchID] = append(result[r.PitchID], r.FileKey)
	}
	return result, nil
}
