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

type ActivityRepository interface {
	Create(ctx context.Context, activity *models.Activity) (*models.Activity, error)
	CreateActivityTx(ctx context.Context, tx bun.Tx, activity *models.Activity) (*models.Activity, error)
	Find(ctx context.Context, activityID uuid.UUID) (*models.ActivityDatabaseResponse, error)
	FindByTripID(ctx context.Context, tripID uuid.UUID, cursor *models.ActivityCursor, limit int) ([]*models.ActivityDatabaseResponse, *models.ActivityCursor, error)
	FindByCategoryName(ctx context.Context, tripID uuid.UUID, categoryName string, cursor *models.ActivityCursor, limit int) ([]*models.ActivityDatabaseResponse, *models.ActivityCursor, error)
	FindByTimeOfDay(ctx context.Context, tripID uuid.UUID, timeOfDay models.ActivityTimeOfDay, cursor *models.ActivityCursor, limit int) ([]*models.ActivityDatabaseResponse, *models.ActivityCursor, error)
	FindByCategoryAndTimeOfDay(ctx context.Context, tripID uuid.UUID, categoryName string, timeOfDay models.ActivityTimeOfDay, cursor *models.ActivityCursor, limit int) ([]*models.ActivityDatabaseResponse, *models.ActivityCursor, error)
	Exists(ctx context.Context, activityID uuid.UUID) (bool, error)
	CountByTripID(ctx context.Context, tripID uuid.UUID) (int, error)
	Update(ctx context.Context, activityID uuid.UUID, req *models.UpdateActivityRequest) (*models.Activity, error)
	UpdateTx(ctx context.Context, tx bun.Tx, activityID uuid.UUID, req *models.UpdateActivityRequest) (*models.Activity, error)
	Delete(ctx context.Context, activityID uuid.UUID) error
	AddImagesTx(ctx context.Context, tx bun.Tx, activityID uuid.UUID, imageIDs []uuid.UUID) error
	ReplaceImagesTx(ctx context.Context, tx bun.Tx, activityID uuid.UUID, imageIDs []uuid.UUID) error
}

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

// CreateActivityTx creates an activity in a transaction
func (r *activityRepository) CreateActivityTx(ctx context.Context, tx bun.Tx, activity *models.Activity) (*models.Activity, error) {
	_, err := tx.NewInsert().Model(activity).Returning("*").Exec(ctx)
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
		ColumnExpr("COALESCE(json_agg(ai.image_id) FILTER (WHERE ai.image_id IS NOT NULL), '[]') AS image_keys").
		Join("JOIN users AS u ON u.id = a.proposed_by").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?", models.ImageSizeSmall, models.UploadStatusConfirmed).
		Join("LEFT JOIN activity_images AS ai ON ai.activity_id = a.id").
		Where("a.id = ?", activityID).
		GroupExpr("a.id, u.username, u.profile_picture, img.file_key").
		Scan(ctx, activity)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return activity, nil
}

// FindByTripID retrieves all activities for a trip
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
		ColumnExpr("COALESCE(json_agg(ai.image_id) FILTER (WHERE ai.image_id IS NOT NULL), '[]') AS image_keys").
		Join("JOIN users AS u ON u.id = a.proposed_by").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?", models.ImageSizeSmall, models.UploadStatusConfirmed).
		Join("LEFT JOIN activity_images AS ai ON ai.activity_id = a.id").
		Where("a.trip_id = ?", tripID).
		GroupExpr("a.id, u.username, u.profile_picture, img.file_key").
		OrderExpr("a.created_at DESC, a.id DESC")

	return r.executePaginatedQuery(ctx, query, cursor, limit)
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
		ColumnExpr("COALESCE(json_agg(ai.image_id) FILTER (WHERE ai.image_id IS NOT NULL), '[]') AS image_keys").
		Join("JOIN users AS u ON u.id = a.proposed_by").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?", models.ImageSizeSmall, models.UploadStatusConfirmed).
		Join("JOIN activity_categories AS ac ON ac.activity_id = a.id").
		Join("JOIN categories AS cat ON cat.trip_id = a.trip_id AND cat.name = ac.category_name").
		Join("LEFT JOIN activity_images AS ai ON ai.activity_id = a.id").
		Where("a.trip_id = ?", tripID).
		Where("ac.category_name = ?", categoryName).
		Where("cat.is_hidden = false").
		GroupExpr("a.id, u.username, u.profile_picture, img.file_key").
		OrderExpr("a.created_at DESC, a.id DESC")

	return r.executePaginatedQuery(ctx, query, cursor, limit)
}

func (r *activityRepository) FindByTimeOfDay(
	ctx context.Context,
	tripID uuid.UUID,
	timeOfDay models.ActivityTimeOfDay,
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
		Where("a.time_of_day = ?", timeOfDay).
		OrderExpr("a.created_at DESC, a.id DESC")

	return r.executePaginatedQuery(ctx, query, cursor, limit)
}

func (r *activityRepository) FindByCategoryAndTimeOfDay(
	ctx context.Context,
	tripID uuid.UUID,
	categoryName string,
	timeOfDay models.ActivityTimeOfDay,
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
		Where("a.time_of_day = ?", timeOfDay).
		OrderExpr("a.created_at DESC, a.id DESC")

	return r.executePaginatedQuery(ctx, query, cursor, limit)
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

	if req.TimeOfDay != nil {
		updateQuery = updateQuery.Set("time_of_day = ?", *req.TimeOfDay)
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

	if req.LocationName != nil {
		updateQuery = updateQuery.Set("location_name = ?", *req.LocationName)
	}

	if req.LocationLat != nil {
		updateQuery = updateQuery.Set("location_lat = ?", *req.LocationLat)
	}

	if req.LocationLng != nil {
		updateQuery = updateQuery.Set("location_lng = ?", *req.LocationLng)
	}

	if req.EstimatedPrice != nil {
		updateQuery = updateQuery.Set("estimated_price = ?", *req.EstimatedPrice)
	}

	// Atomic update with RETURNING to avoid race conditions
	updatedActivity := &models.Activity{}
	err := updateQuery.
		Returning("*").
		Scan(ctx, updatedActivity)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}

	return updatedActivity, nil
}

// UpdateTx modifies an activity within the provided transaction
func (r *activityRepository) UpdateTx(ctx context.Context, tx bun.Tx, activityID uuid.UUID, req *models.UpdateActivityRequest) (*models.Activity, error) {
	updateQuery := tx.NewUpdate().
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
	if req.LocationName != nil {
		updateQuery = updateQuery.Set("location_name = ?", *req.LocationName)
	}
	if req.LocationLat != nil {
		updateQuery = updateQuery.Set("location_lat = ?", *req.LocationLat)
	}
	if req.LocationLng != nil {
		updateQuery = updateQuery.Set("location_lng = ?", *req.LocationLng)
	}
	if req.EstimatedPrice != nil {
		updateQuery = updateQuery.Set("estimated_price = ?", *req.EstimatedPrice)
	}

	updatedActivity := &models.Activity{}
	err := updateQuery.Returning("*").Scan(ctx, updatedActivity)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errs.ErrNotFound
		}
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

// Helper method to apply cursor pagination and execute query
func (r *activityRepository) executePaginatedQuery(
	ctx context.Context,
	query *bun.SelectQuery,
	cursor *models.ActivityCursor,
	limit int,
) ([]*models.ActivityDatabaseResponse, *models.ActivityCursor, error) {
	// Apply cursor if provided
	if cursor != nil {
		query = query.Where("(a.created_at, a.id) < (?, ?)", cursor.CreatedAt, cursor.ID)
	}

	// Fetch limit+1 to detect if there's a next page
	query = query.Limit(limit + 1)

	var activities []*models.ActivityDatabaseResponse
	err := query.Scan(ctx, &activities)
	if err != nil {
		return nil, nil, err
	}

	// Determine next cursor and trim results
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

// AddImagesTx adds images to an activity in a transaction
func (r *activityRepository) AddImagesTx(ctx context.Context, tx bun.Tx, activityID uuid.UUID, imageIDs []uuid.UUID) error {
	if len(imageIDs) == 0 {
		return nil
	}
	now := time.Now()
	activityImages := make([]*models.ActivityImage, len(imageIDs))
	for i, imageID := range imageIDs {
		activityImages[i] = &models.ActivityImage{
			ActivityID: activityID,
			ImageID:    imageID,
			CreatedAt:  now,
		}
	}
	_, err := tx.NewInsert().
		Model(&activityImages).
		On("CONFLICT (activity_id, image_id) DO NOTHING").
		Exec(ctx)
	return err
}

// ReplaceImagesTx replaces images for an activity in a transaction
func (r *activityRepository) ReplaceImagesTx(ctx context.Context, tx bun.Tx, activityID uuid.UUID, imageIDs []uuid.UUID) error {
	_, err := tx.NewDelete().Table("activity_images").Where("activity_id = ?", activityID).Exec(ctx)
	if err != nil {
		return err
	}
	return r.AddImagesTx(ctx, tx, activityID, imageIDs)
}
