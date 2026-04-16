package repository

import (
	"context"
	"database/sql"
	"time"
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
	CountByTripID(ctx context.Context, tripID uuid.UUID) (int, error)
	EnsureCategoriesExistTx(ctx context.Context, tx bun.Tx, tripID uuid.UUID, names []string) error
	EnsureCategoriesExist(ctx context.Context, tripID uuid.UUID, names []string) error
	SetHidden(ctx context.Context, tripID uuid.UUID, name string, isHidden bool) error
	Delete(ctx context.Context, tripID uuid.UUID, name string) error
	UpdateOrder(ctx context.Context, tripID uuid.UUID, tabs []models.CategoryTabOrder) error
	UpsertBatchTx(ctx context.Context, tx bun.Tx, tripID uuid.UUID, names []string) error
}

var _ CategoryRepository = (*categoryRepository)(nil)

type categoryRepository struct {
	db *bun.DB
}

func NewCategoryRepository(db *bun.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

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
		Order("position ASC")

	if !includeHidden {
		q = q.Where("is_hidden = false")
	}

	if err := q.Scan(ctx); err != nil {
		return nil, err
	}
	return categories, nil
}

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

func (r *categoryRepository) CountByTripID(ctx context.Context, tripID uuid.UUID) (int, error) {
	count, err := r.db.NewSelect().
		Model((*models.Category)(nil)).
		Where("trip_id = ?", tripID).
		Count(ctx)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// EnsureCategoriesExistTx inserts non-default categories that don't already exist,
// assigning each a position based on the current count to avoid unique constraint violations.
// For use inside a transaction.
func (r *categoryRepository) EnsureCategoriesExistTx(ctx context.Context, tx bun.Tx, tripID uuid.UUID, names []string) error {
	for _, name := range names {
		_, err := tx.NewRaw(`
			INSERT INTO categories (trip_id, name, label, is_default, view_type, position, created_at, updated_at)
			SELECT ?, ?, ?, false, 'activity', (SELECT COUNT(*) FROM categories WHERE trip_id = ?), now(), now()
			ON CONFLICT (trip_id, name) DO NOTHING
		`, tripID, name, name, tripID).Exec(ctx)
		if err != nil {
			return err
		}
	}
	return nil
}

// EnsureCategoriesExist inserts non-default categories that don't already exist,
// assigning each a position based on the current count to avoid unique constraint violations.
// For use outside a transaction.
func (r *categoryRepository) EnsureCategoriesExist(ctx context.Context, tripID uuid.UUID, names []string) error {
	for _, name := range names {
		_, err := r.db.NewRaw(`
			INSERT INTO categories (trip_id, name, label, is_default, view_type, position, created_at, updated_at)
			SELECT ?, ?, ?, false, 'activity', (SELECT COUNT(*) FROM categories WHERE trip_id = ?), now(), now()
			ON CONFLICT (trip_id, name) DO NOTHING
		`, tripID, name, name, tripID).Exec(ctx)
		if err != nil {
			return err
		}
	}
	return nil
}

// UpsertBatchTx inserts default categories for a trip in a transaction, ignoring conflicts.
// Only use this for seeding defaults on trip creation.
func (r *categoryRepository) UpsertBatchTx(ctx context.Context, tx bun.Tx, tripID uuid.UUID, names []string) error {
	if len(names) == 0 {
		return nil
	}
	now := time.Now()
	categories := make([]*models.Category, 0, len(names))
	for i, name := range names {
		label, ok := models.DefaultCategoryLabels[name]
		if !ok {
			label = name
		}
		categories = append(categories, &models.Category{
			TripID:    tripID,
			Name:      name,
			Label:     label,
			IsDefault: true,
			ViewType:  models.CategoryViewTypeActivity,
			Position:  i,
			CreatedAt: now,
			UpdatedAt: now,
		})
	}
	_, err := tx.NewInsert().
		Model(&categories).
		On("CONFLICT (trip_id, name) DO NOTHING").
		Exec(ctx)
	return err
}

func (r *categoryRepository) SetHidden(ctx context.Context, tripID uuid.UUID, name string, isHidden bool) error {
	_, err := r.db.NewUpdate().
		Model((*models.Category)(nil)).
		Set("is_hidden = ?", isHidden).
		Where("trip_id = ? AND name = ?", tripID, name).
		Exec(ctx)
	return err
}

func (r *categoryRepository) Delete(ctx context.Context, tripID uuid.UUID, name string) error {
	_, err := r.db.NewDelete().
		Model((*models.Category)(nil)).
		Where("trip_id = ? AND name = ?", tripID, name).
		Exec(ctx)
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
