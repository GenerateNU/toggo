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

var _ ActivityRepository = (*activityRepository)(nil)

type activityRepository struct {
	db *bun.DB
}

func NewActivityRepository(db *bun.DB) ActivityRepository {
	return &activityRepository{db: db}
}

// Create adds a new activity to a trip
func (r *activityRepository) Create(ctx context.Context, activity *models.Activity) (*models.Activity, error) {
	_, err := r.db.NewInsert().
		Model(activity).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return activity, nil
}

// Find retrieves a specific activity by ID with proposer details (categories fetched separately)
func (r *activityRepository) Find(ctx context.Context, activityID uuid.UUID) (*models.ActivityDatabaseResponse, error) {
	activity := &models.ActivityDatabaseResponse{}
	err := r.db.NewSelect().
		TableExpr("activities AS a").
		ColumnExpr("a.*").
		ColumnExpr("u.username AS proposer_username").
		ColumnExpr("u.profile_picture AS proposer_picture_id").
		ColumnExpr("img.file_key AS proposer_picture_key").
		Join("JOIN users AS u ON u.id = a.proposed_by").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?", models.ImageSizeSmall, models.UploadStatusConfirmed).
		Where("a.id = ?", activityID).
		Scan(ctx, activity)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return activity, nil
}

// FindByTripID retrieves all activities for a trip with cursor pagination (categories fetched separately)
func (r *activityRepository) FindByTripID(
	ctx context.Context,
	tripID uuid.UUID,
	cursor *models.ActivityCursor,
	limit int,
) ([]*models.ActivityDatabaseResponse, *models.ActivityCursor, error) {
	query := r.db.NewSelect().
		TableExpr("activities AS a").
		ColumnExpr("a.*").
		ColumnExpr("u.username AS proposer_username").
		ColumnExpr("u.profile_picture AS proposer_picture_id").
		ColumnExpr("img.file_key AS proposer_picture_key").
		Join("JOIN users AS u ON u.id = a.proposed_by").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?", models.ImageSizeSmall, models.UploadStatusConfirmed).
		Where("a.trip_id = ?", tripID).
		OrderExpr("a.created_at DESC, a.id DESC").
		Limit(limit + 1)

	if cursor != nil {
		query = query.
			Where("(a.created_at, a.id) < (?, ?)", cursor.CreatedAt, cursor.ID)
	}

	var activities []*models.ActivityDatabaseResponse
	err := query.Scan(ctx, &activities)
	if err != nil {
		return nil, nil, err
	}

	var nextCursor *models.ActivityCursor
	if len(activities) > limit {
		lastActivity := activities[limit-1]
		nextCursor = &models.ActivityCursor{
			CreatedAt: lastActivity.CreatedAt,
			ID:        lastActivity.ID,
		}
		activities = activities[:limit]
	}

	return activities, nextCursor, nil
}

// FindByCategoryName retrieves all activities for a trip filtered by category
func (r *activityRepository) FindByCategoryName(
	ctx context.Context,
	tripID uuid.UUID,
	categoryName string,
	cursor *models.ActivityCursor,
	limit int,
) ([]*models.ActivityDatabaseResponse, *models.ActivityCursor, error) {
	query := r.db.NewSelect().
		TableExpr("activities AS a").
		ColumnExpr("a.*").
		ColumnExpr("u.username AS proposer_username").
		ColumnExpr("u.profile_picture AS proposer_picture_id").
		ColumnExpr("img.file_key AS proposer_picture_key").
		Join("JOIN users AS u ON u.id = a.proposed_by").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?", models.ImageSizeSmall, models.UploadStatusConfirmed).
		Join("JOIN activity_categories AS ac ON ac.activity_id = a.id").
		Where("a.trip_id = ? AND ac.category_name = ?", tripID, categoryName).
		OrderExpr("a.created_at DESC, a.id DESC").
		Limit(limit + 1)

	if cursor != nil {
		query = query.
			Where("(a.created_at, a.id) < (?, ?)", cursor.CreatedAt, cursor.ID)
	}

	var activities []*models.ActivityDatabaseResponse
	err := query.Scan(ctx, &activities)
	if err != nil {
		return nil, nil, err
	}

	var nextCursor *models.ActivityCursor
	if len(activities) > limit {
		lastActivity := activities[limit-1]
		nextCursor = &models.ActivityCursor{
			CreatedAt: lastActivity.CreatedAt,
			ID:        lastActivity.ID,
		}
		activities = activities[:limit]
	}

	return activities, nextCursor, nil
}

// Exists checks if an activity exists
func (r *activityRepository) Exists(ctx context.Context, activityID uuid.UUID) (bool, error) {
	count, err := r.db.NewSelect().
		Model((*models.Activity)(nil)).
		Where("id = ?", activityID).
		Count(ctx)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// CountByTripID returns the number of activities in a trip
func (r *activityRepository) CountByTripID(ctx context.Context, tripID uuid.UUID) (int, error) {
	count, err := r.db.NewSelect().
		Model((*models.Activity)(nil)).
		Where("trip_id = ?", tripID).
		Count(ctx)
	return count, err
}

// Update modifies an activity (categories managed separately)
func (r *activityRepository) Update(ctx context.Context, activityID uuid.UUID, req *models.UpdateActivityRequest) (*models.Activity, error) {
	updateQuery := r.db.NewUpdate().
		Model(&models.Activity{}).
		Where("id = ?", activityID).
		Set("updated_at = ?", time.Now())

	if req.Name != nil {
		updateQuery = updateQuery.Set("name = ?", *req.Name)
	}

	if req.ThumbnailURL != nil {
		updateQuery = updateQuery.Set("thumbnail_url = ?", *req.ThumbnailURL)
	}

	if req.MediaURL != nil {
		updateQuery = updateQuery.Set("media_url = ?", *req.MediaURL)
	}

	if req.Description != nil {
		updateQuery = updateQuery.Set("description = ?", *req.Description)
	}

	if req.Dates != nil {
		updateQuery = updateQuery.Set("dates = ?", *req.Dates)
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

	updatedActivity := &models.Activity{}
	err = r.db.NewSelect().
		Model(updatedActivity).
		Where("id = ?", activityID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return updatedActivity, nil
}

// Delete removes an activity (idempotent, cascade deletes categories)
func (r *activityRepository) Delete(ctx context.Context, activityID uuid.UUID) error {
	_, err := r.db.NewDelete().
		Model((*models.Activity)(nil)).
		Where("id = ?", activityID).
		Exec(ctx)

	return err
}