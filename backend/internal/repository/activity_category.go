package repository

import (
	"context"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

var _ ActivityCategoryRepository = (*activityCategoryRepository)(nil)

type activityCategoryRepository struct {
	db *bun.DB
}

func NewActivityCategoryRepository(db *bun.DB) ActivityCategoryRepository {
	return &activityCategoryRepository{db: db}
}

// AddCategoriesToActivity adds multiple categories to an activity
func (r *activityCategoryRepository) AddCategoriesToActivity(ctx context.Context, activityID, tripID uuid.UUID, categoryNames []string) error {
	if len(categoryNames) == 0 {
		return nil
	}

	activityCategories := make([]*models.ActivityCategory, 0, len(categoryNames))
	for _, categoryName := range categoryNames {
		activityCategories = append(activityCategories, &models.ActivityCategory{
			ActivityID:   activityID,
			TripID:       tripID,
			CategoryName: categoryName,
		})
	}

	_, err := r.db.NewInsert().
		Model(&activityCategories).
		On("CONFLICT (activity_id, category_name) DO NOTHING"). // Idempotent
		Exec(ctx)
	return err
}

// RemoveCategoryFromActivity removes a specific category from an activity
func (r *activityCategoryRepository) RemoveCategoryFromActivity(ctx context.Context, activityID uuid.UUID, categoryName string) error {
	_, err := r.db.NewDelete().
		Model((*models.ActivityCategory)(nil)).
		Where("activity_id = ? AND category_name = ?", activityID, categoryName).
		Exec(ctx)
	return err
}

// GetCategoriesForActivity retrieves categories for an activity with pagination
func (r *activityCategoryRepository) GetCategoriesForActivity(ctx context.Context, activityID uuid.UUID, limit int, cursor *string) ([]string, *string, error) {
	query := r.db.NewSelect().
		Model((*models.ActivityCategory)(nil)).
		Column("category_name").
		Where("activity_id = ?", activityID).
		Order("category_name ASC").
		Limit(limit + 1)

	// Apply cursor if provided
	if cursor != nil && *cursor != "" {
		query = query.Where("category_name > ?", *cursor)
	}

	var activityCategories []*models.ActivityCategory
	err := query.Scan(ctx, &activityCategories)
	if err != nil {
		return nil, nil, err
	}

	// Determine next cursor
	var nextCursor *string
	if len(activityCategories) > limit {
		lastCategory := activityCategories[limit-1].CategoryName
		nextCursor = &lastCategory
		activityCategories = activityCategories[:limit]
	}

	categoryNames := make([]string, len(activityCategories))
	for i, ac := range activityCategories {
		categoryNames[i] = ac.CategoryName
	}
	
	return categoryNames, nextCursor, nil
}

// GetCategoriesForActivities retrieves categories for multiple activities (batch)
func (r *activityCategoryRepository) GetCategoriesForActivities(ctx context.Context, activityIDs []uuid.UUID) (map[uuid.UUID][]string, error) {
	if len(activityIDs) == 0 {
		return make(map[uuid.UUID][]string), nil
	}

	var activityCategories []*models.ActivityCategory
	err := r.db.NewSelect().
		Model(&activityCategories).
		Where("activity_id IN (?)", bun.In(activityIDs)).
		Order("activity_id ASC", "category_name ASC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	// Group by activity ID
	result := make(map[uuid.UUID][]string)
	for _, ac := range activityCategories {
		result[ac.ActivityID] = append(result[ac.ActivityID], ac.CategoryName)
	}
	return result, nil
}

// RemoveAllCategoriesFromActivity removes all categories from an activity
func (r *activityCategoryRepository) RemoveAllCategoriesFromActivity(ctx context.Context, activityID uuid.UUID) error {
	_, err := r.db.NewDelete().
		Model((*models.ActivityCategory)(nil)).
		Where("activity_id = ?", activityID).
		Exec(ctx)
	return err
}