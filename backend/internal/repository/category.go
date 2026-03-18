package repository

import (
	"context"
	"database/sql"
	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type CategoryRepository interface {
	Create(ctx context.Context, category *models.Category) (*models.Category, error)
	Find(ctx context.Context, tripID uuid.UUID, name string) (*models.Category, error)
	FindByTripID(ctx context.Context, tripID uuid.UUID, includeHidden bool) ([]*models.Category, error)
	Exists(ctx context.Context, tripID uuid.UUID, name string) (bool, error)
	SetHidden(ctx context.Context, tripID uuid.UUID, name string, isHidden bool) error
	Delete(ctx context.Context, tripID uuid.UUID, name string) error
	UpdateOrder(ctx context.Context, tripID uuid.UUID, tabs []models.CategoryTabOrder) error
}

var _ CategoryRepository = (*categoryRepository)(nil)

type categoryRepository struct {
	db *bun.DB
}

func NewCategoryRepository(db *bun.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

// Create adds a new category to a trip
func (r *categoryRepository) Create(ctx context.Context, category *models.Category) (*models.Category, error) {
	_, err := r.db.NewInsert().
		Model(category).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return category, nil
}

// Find retrieves a specific category by composite key
func (r *categoryRepository) Find(ctx context.Context, tripID uuid.UUID, name string) (*models.Category, error) {
	category := &models.Category{}
	err := r.db.NewSelect().
		Model(category).
		Where("trip_id = ? AND name = ?", tripID, name).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return category, nil
}

// FindByTripID retrieves categories for a trip ordered by position.
// Pass includeHidden=true to also return hidden categories (admin use).
func (r *categoryRepository) FindByTripID(ctx context.Context, tripID uuid.UUID, includeHidden bool) ([]*models.Category, error) {
	var categories []*models.Category
	q := r.db.NewSelect().
		Model(&categories).
		Where("trip_id = ?", tripID).
		OrderExpr("position ASC")

	if !includeHidden {
		q = q.Where("is_hidden = false")
	}

	if err := q.Scan(ctx); err != nil {
		return nil, err
	}
	return categories, nil
}

// Exists checks if a category exists for a trip
func (r *categoryRepository) Exists(ctx context.Context, tripID uuid.UUID, name string) (bool, error) {
	count, err := r.db.NewSelect().
		Model((*models.Category)(nil)).
		Where("trip_id = ? AND name = ?", tripID, name).
		Count(ctx)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// SetHidden sets the is_hidden flag on a category
func (r *categoryRepository) SetHidden(ctx context.Context, tripID uuid.UUID, name string, isHidden bool) error {
	_, err := r.db.NewUpdate().
		Model((*models.Category)(nil)).
		Set("is_hidden = ?", isHidden).
		Where("trip_id = ? AND name = ?", tripID, name).
		Exec(ctx)
	return err
}

// Delete removes a category (idempotent)
func (r *categoryRepository) Delete(ctx context.Context, tripID uuid.UUID, name string) error {
	_, err := r.db.NewDelete().
		Model((*models.Category)(nil)).
		Where("trip_id = ? AND name = ?", tripID, name).
		Exec(ctx)

	// Idempotent - don't error if already deleted
	return err
}

// UpdateOrder updates the position of multiple categories in a single transaction.
// Uses a two-phase update to avoid unique constraint violations during reordering.
func (r *categoryRepository) UpdateOrder(ctx context.Context, tripID uuid.UUID, tabs []models.CategoryTabOrder) error {
	return r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		// Phase 1: set positions to a temporary large offset to avoid conflicts
		for _, t := range tabs {
			_, err := tx.NewUpdate().
				Model((*models.Category)(nil)).
				Set("position = ?", t.Position+1000000).
				Where("trip_id = ? AND name = ?", tripID, t.Name).
				Exec(ctx)
			if err != nil {
				return err
			}
		}

		// Phase 2: set the real positions
		for _, t := range tabs {
			result, err := tx.NewUpdate().
				Model((*models.Category)(nil)).
				Set("position = ?", t.Position).
				Where("trip_id = ? AND name = ?", tripID, t.Name).
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