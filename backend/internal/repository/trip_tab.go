package repository

import (
	"context"
	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type TripTabRepository interface {
	FindByTripID(ctx context.Context, tripID uuid.UUID) ([]*models.TripTab, error)
	Create(ctx context.Context, tab *models.TripTab) (*models.TripTab, error)
	UpdateOrder(ctx context.Context, tripID uuid.UUID, tabs []models.TripTabOrder) error
	Delete(ctx context.Context, id, tripID uuid.UUID) error
}

var _ TripTabRepository = (*tripTabRepository)(nil)

type tripTabRepository struct {
	db *bun.DB
}

func NewTripTabRepository(db *bun.DB) TripTabRepository {
	return &tripTabRepository{db: db}
}

// FindByTripID retrieves all tabs for a trip ordered by position
func (r *tripTabRepository) FindByTripID(ctx context.Context, tripID uuid.UUID) ([]*models.TripTab, error) {
	var tabs []*models.TripTab
	err := r.db.NewSelect().
		Model(&tabs).
		Where("trip_id = ?", tripID).
		OrderExpr("position ASC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return tabs, nil
}

// Create adds a new tab to a trip
func (r *tripTabRepository) Create(ctx context.Context, tab *models.TripTab) (*models.TripTab, error) {
	_, err := r.db.NewInsert().
		Model(tab).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return tab, nil
}

// UpdateOrder updates the position of multiple tabs in a single transaction.
// Uses a two-phase update to avoid unique constraint violations during reordering.
func (r *tripTabRepository) UpdateOrder(ctx context.Context, tripID uuid.UUID, tabs []models.TripTabOrder) error {
	return r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		// Phase 1: set positions to a temporary large offset to avoid conflicts
		for _, t := range tabs {
			_, err := tx.NewUpdate().
				Model((*models.TripTab)(nil)).
				Set("position = ?", t.Position+1000000).
				Where("id = ? AND trip_id = ?", t.ID, tripID).
				Exec(ctx)
			if err != nil {
				return err
			}
		}

		// Phase 2: set the real positions
		for _, t := range tabs {
			result, err := tx.NewUpdate().
				Model((*models.TripTab)(nil)).
				Set("position = ?", t.Position).
				Where("id = ? AND trip_id = ?", t.ID, tripID).
				Exec(ctx)
			if err != nil {
				return err
			}
			rowsAffected, err := result.RowsAffected()
			if err != nil {
				return err
			}
			if rowsAffected == 0 {
				return errs.ErrNotFound
			}
		}
		return nil
	})
}

// Delete removes a tab
func (r *tripTabRepository) Delete(ctx context.Context, id, tripID uuid.UUID) error {
	result, err := r.db.NewDelete().
		Model((*models.TripTab)(nil)).
		Where("id = ? AND trip_id = ?", id, tripID).
		Exec(ctx)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errs.ErrNotFound
	}
	return nil
}