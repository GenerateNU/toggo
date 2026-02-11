package repository

import (
	"context"
	"database/sql"
	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

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

// FindByTripID retrieves all categories for a trip
func (r *categoryRepository) FindByTripID(ctx context.Context, tripID uuid.UUID) ([]*models.Category, error) {
	var categories []*models.Category
	err := r.db.NewSelect().
		Model(&categories).
		Where("trip_id = ?", tripID).
		Order("name ASC").
		Scan(ctx)
	if err != nil {
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

// Delete removes a category (idempotent)
func (r *categoryRepository) Delete(ctx context.Context, tripID uuid.UUID, name string) error {
	_, err := r.db.NewDelete().
		Model((*models.Category)(nil)).
		Where("trip_id = ? AND name = ?", tripID, name).
		Exec(ctx)

	// Idempotent - don't error if already deleted
	return err
}