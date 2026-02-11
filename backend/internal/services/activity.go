package services

import (
	"context"
	"time"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"
	"toggo/internal/utilities/pagination"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type ActivityServiceInterface interface {
	CreateActivity(ctx context.Context, req models.CreateActivityRequest, userID uuid.UUID) (*models.ActivityAPIResponse, error)
	GetActivity(ctx context.Context, activityID, userID uuid.UUID) (*models.ActivityAPIResponse, error)
	GetActivitiesByTripID(ctx context.Context, tripID, userID uuid.UUID, limit int, cursorToken string) (*models.ActivityCursorPageResult, error)
	GetActivitiesByCategory(ctx context.Context, tripID, userID uuid.UUID, categoryName string, limit int, cursorToken string) (*models.ActivityCursorPageResult, error)
	UpdateActivity(ctx context.Context, activityID, userID uuid.UUID, req models.UpdateActivityRequest) (*models.Activity, error)
	DeleteActivity(ctx context.Context, activityID, userID uuid.UUID) error
	
	// Category management on activities
	GetActivityCategories(ctx context.Context, activityID, userID uuid.UUID, limit int, cursorToken string) (*models.ActivityCategoriesPageResult, error)
	AddCategoryToActivity(ctx context.Context, activityID, userID uuid.UUID, categoryName string) error
	RemoveCategoryFromActivity(ctx context.Context, activityID, userID uuid.UUID, categoryName string) error
}

var _ ActivityServiceInterface = (*ActivityService)(nil)

type ActivityService struct {
	*repository.Repository
	fileService     FileServiceInterface
	categoryService CategoryServiceInterface
}

func NewActivityService(repo *repository.Repository, fileService FileServiceInterface, categoryService CategoryServiceInterface) ActivityServiceInterface {
	return &ActivityService{
		Repository:      repo,
		fileService:     fileService,
		categoryService: categoryService,
	}
}

func (s *ActivityService) CreateActivity(ctx context.Context, req models.CreateActivityRequest, userID uuid.UUID) (*models.ActivityAPIResponse, error) {
	// Validate trip exists
	_, err := s.Trip.Find(ctx, req.TripID)
	if err != nil {
		return nil, errs.ErrNotFound
	}

	// Validate user is member of trip
	isMember, err := s.Membership.IsMember(ctx, req.TripID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errs.Forbidden()
	}

	// Use transaction to create activity and categories atomically
	var createdActivity *models.Activity
	err = s.Repository.GetDB().RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		// Create activity
		activity := &models.Activity{
			TripID:       req.TripID,
			ProposedBy:   &userID,
			Name:         req.Name,
			ThumbnailURL: req.ThumbnailURL,
			MediaURL:     req.MediaURL,
			Description:  req.Description,
			Dates:        req.Dates,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		_, err := tx.NewInsert().
			Model(activity).
			Returning("*").
			Exec(ctx)
		if err != nil {
			return err
		}
		createdActivity = activity

		// If categories provided, create them and link to activity
		if len(req.CategoryNames) > 0 {
			// Create categories (idempotent - won't fail on duplicates)
			for _, categoryName := range req.CategoryNames {
				category := &models.Category{
					TripID:    req.TripID,
					Name:      categoryName,
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				}
				_, err = tx.NewInsert().
					Model(category).
					On("CONFLICT (trip_id, name) DO NOTHING").  // Idempotent!
					Exec(ctx)
				if err != nil {
					return err
				}
			}

			// Link categories to activity
			activityCategories := make([]*models.ActivityCategory, 0, len(req.CategoryNames))
			for _, categoryName := range req.CategoryNames {
				activityCategories = append(activityCategories, &models.ActivityCategory{
					ActivityID:   activity.ID,
					TripID:       req.TripID,
					CategoryName: categoryName,
					CreatedAt:    time.Now(),
				})
			}
			_, err = tx.NewInsert().Model(&activityCategories).Exec(ctx)
			if err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Fetch complete activity with categories
	return s.GetActivity(ctx, createdActivity.ID, userID)
}

func (s *ActivityService) GetActivity(ctx context.Context, activityID, userID uuid.UUID) (*models.ActivityAPIResponse, error) {
	activity, err := s.Activity.Find(ctx, activityID)
	if err != nil {
		return nil, err
	}

	// Validate user is member of the trip
	isMember, err := s.Membership.IsMember(ctx, activity.TripID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errs.Forbidden()
	}

	// Fetch categories for this activity (fetch all within known max)
	categories, _, err := s.ActivityCategory.GetCategoriesForActivity(ctx, activityID, models.MaxCategoriesPerActivity, nil)
	if err != nil {
		return nil, err
	}

	activity.CategoryNames = categories

	return s.toAPIResponse(ctx, activity)
}

func (s *ActivityService) GetActivitiesByTripID(ctx context.Context, tripID, userID uuid.UUID, limit int, cursorToken string) (*models.ActivityCursorPageResult, error) {
	// Validate trip exists
	_, err := s.Trip.Find(ctx, tripID)
	if err != nil {
		return nil, errs.ErrNotFound
	}

	// Validate user is member of trip
	isMember, err := s.Membership.IsMember(ctx, tripID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errs.Forbidden()
	}

	cursor, err := pagination.ParseCursor(cursorToken)
	if err != nil {
		return nil, err
	}

	activities, nextCursor, err := s.Activity.FindByTripID(ctx, tripID, cursor, limit)
	if err != nil {
		return nil, err
	}

	return s.buildActivityListResponse(ctx, activities, nextCursor, limit)
}

func (s *ActivityService) GetActivitiesByCategory(ctx context.Context, tripID, userID uuid.UUID, categoryName string, limit int, cursorToken string) (*models.ActivityCursorPageResult, error) {
	// Validate trip exists
	_, err := s.Trip.Find(ctx, tripID)
	if err != nil {
		return nil, errs.ErrNotFound
	}

	// Validate user is member of trip
	isMember, err := s.Membership.IsMember(ctx, tripID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errs.Forbidden()
	}

	cursor, err := pagination.ParseCursor(cursorToken)
	if err != nil {
		return nil, err
	}

	activities, nextCursor, err := s.Activity.FindByCategoryName(ctx, tripID, categoryName, cursor, limit)
	if err != nil {
		return nil, err
	}

	return s.buildActivityListResponse(ctx, activities, nextCursor, limit)
}

func (s *ActivityService) UpdateActivity(ctx context.Context, activityID, userID uuid.UUID, req models.UpdateActivityRequest) (*models.Activity, error) {
	// Get existing activity
	activity, err := s.Activity.Find(ctx, activityID)
	if err != nil {
		return nil, err
	}

	// Validate user is member of trip
	isMember, err := s.Membership.IsMember(ctx, activity.TripID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errs.Forbidden()
	}

	return s.Activity.Update(ctx, activityID, &req)
}

func (s *ActivityService) DeleteActivity(ctx context.Context, activityID, userID uuid.UUID) error {
	// Get activity to check permissions
	activity, err := s.Activity.Find(ctx, activityID)
	if err != nil {
		return err
	}

	// Validate user is member of trip
	isMember, err := s.Membership.IsMember(ctx, activity.TripID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errs.Forbidden()
	}

	// Check if user is admin or the proposer
	isAdmin, err := s.Membership.IsAdmin(ctx, activity.TripID, userID)
	if err != nil {
		return err
	}

	if !isAdmin && activity.ProposedBy != nil && *activity.ProposedBy != userID {
		return errs.Forbidden()
	}

	return s.Activity.Delete(ctx, activityID)
}

// GetActivityCategories retrieves categories for an activity with pagination
func (s *ActivityService) GetActivityCategories(ctx context.Context, activityID, userID uuid.UUID, limit int, cursorToken string) (*models.ActivityCategoriesPageResult, error) {
	// Get activity to check permissions
	activity, err := s.Activity.Find(ctx, activityID)
	if err != nil {
		return nil, err
	}

	// Validate user is member of trip
	isMember, err := s.Membership.IsMember(ctx, activity.TripID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errs.Forbidden()
	}

	// Parse cursor (simple string for category name)
	var cursor *string
	if cursorToken != "" {
		cursor = &cursorToken
	}

	categories, nextCursor, err := s.ActivityCategory.GetCategoriesForActivity(ctx, activityID, limit, cursor)
	if err != nil {
		return nil, err
	}

	result := &models.ActivityCategoriesPageResult{
		Categories: categories,
		Limit:      limit,
	}

	if nextCursor != nil {
		result.NextCursor = nextCursor
	}

	return result, nil
}

// AddCategoryToActivity adds a category to an activity
func (s *ActivityService) AddCategoryToActivity(ctx context.Context, activityID, userID uuid.UUID, categoryName string) error {
	// Get activity to check permissions
	activity, err := s.Activity.Find(ctx, activityID)
	if err != nil {
		return err
	}

	// Validate user is member of trip
	isMember, err := s.Membership.IsMember(ctx, activity.TripID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errs.Forbidden()
	}

	// Create category with ON CONFLICT DO NOTHING (upsert pattern)
	category := &models.Category{
		TripID:    activity.TripID,
		Name:      categoryName,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	
	_, err = s.Repository.GetDB().NewInsert().
		Model(category).
		On("CONFLICT (trip_id, name) DO NOTHING").
		Exec(ctx)
	if err != nil {
		return err
	}

	// Add category to activity (already idempotent in repository)
	return s.ActivityCategory.AddCategoriesToActivity(ctx, activityID, activity.TripID, []string{categoryName})
}

// RemoveCategoryFromActivity removes a category from an activity
func (s *ActivityService) RemoveCategoryFromActivity(ctx context.Context, activityID, userID uuid.UUID, categoryName string) error {
	// Get activity to check permissions
	activity, err := s.Activity.Find(ctx, activityID)
	if err != nil {
		return err
	}

	// Validate user is member of trip
	isMember, err := s.Membership.IsMember(ctx, activity.TripID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errs.Forbidden()
	}

	return s.ActivityCategory.RemoveCategoryFromActivity(ctx, activityID, categoryName)
}

// Helper methods

// Helper to fetch categories and build paginated response
func (s *ActivityService) buildActivityListResponse(ctx context.Context, activities []*models.ActivityDatabaseResponse, nextCursor *models.ActivityCursor, limit int) (*models.ActivityCursorPageResult, error) {
	// Fetch categories for all activities in batch
	activityIDs := make([]uuid.UUID, len(activities))
	for i, activity := range activities {
		activityIDs[i] = activity.ID
	}
	categoriesMap, err := s.ActivityCategory.GetCategoriesForActivities(ctx, activityIDs)
	if err != nil {
		return nil, err
	}

	// Populate categories
	for _, activity := range activities {
		if categories, ok := categoriesMap[activity.ID]; ok {
			activity.CategoryNames = categories
		} else {
			activity.CategoryNames = []string{}
		}
	}

	// Fetch file URLs
	fileURLMap := pagination.FetchFileURLs(ctx, s.fileService, activities, func(item *models.ActivityDatabaseResponse) *string {
		return item.ProposerPictureKey
	}, models.ImageSizeSmall)

	apiActivities := s.convertToAPIActivities(activities, fileURLMap)

	return s.buildActivityPageResult(apiActivities, nextCursor, limit)
}

func (s *ActivityService) toAPIResponse(ctx context.Context, activity *models.ActivityDatabaseResponse) (*models.ActivityAPIResponse, error) {
	var proposerPictureURL *string
	if activity.ProposerPictureID != nil {
		fileResp, err := s.fileService.GetFile(ctx, *activity.ProposerPictureID, models.ImageSizeSmall)
		if err == nil {
			proposerPictureURL = &fileResp.URL
		}
	}

	return &models.ActivityAPIResponse{
		ID:                 activity.ID,
		TripID:             activity.TripID,
		ProposedBy:         activity.ProposedBy,
		Name:               activity.Name,
		ThumbnailURL:       activity.ThumbnailURL,
		MediaURL:           activity.MediaURL,
		Description:        activity.Description,
		Dates:              activity.Dates,
		CreatedAt:          activity.CreatedAt,
		UpdatedAt:          activity.UpdatedAt,
		ProposerUsername:   activity.ProposerUsername,
		ProposerPictureURL: proposerPictureURL,
		CategoryNames:      activity.CategoryNames,
	}, nil
}

func (s *ActivityService) convertToAPIActivities(activities []*models.ActivityDatabaseResponse, fileURLMap map[string]string) []*models.ActivityAPIResponse {
	apiActivities := make([]*models.ActivityAPIResponse, 0, len(activities))
	for _, activity := range activities {
		var proposerPictureURL *string
		if activity.ProposerPictureKey != nil && *activity.ProposerPictureKey != "" {
			if url, exists := fileURLMap[*activity.ProposerPictureKey]; exists {
				proposerPictureURL = &url
			}
		}

		apiActivities = append(apiActivities, &models.ActivityAPIResponse{
			ID:                 activity.ID,
			TripID:             activity.TripID,
			ProposedBy:         activity.ProposedBy,
			Name:               activity.Name,
			ThumbnailURL:       activity.ThumbnailURL,
			MediaURL:           activity.MediaURL,
			Description:        activity.Description,
			Dates:              activity.Dates,
			CreatedAt:          activity.CreatedAt,
			UpdatedAt:          activity.UpdatedAt,
			ProposerUsername:   activity.ProposerUsername,
			ProposerPictureURL: proposerPictureURL,
			CategoryNames:      activity.CategoryNames,
		})
	}
	return apiActivities
}

func (s *ActivityService) buildActivityPageResult(apiActivities []*models.ActivityAPIResponse, nextCursor *models.ActivityCursor, limit int) (*models.ActivityCursorPageResult, error) {
	result := &models.ActivityCursorPageResult{
		Items: apiActivities,
		Limit: limit,
	}

	if nextCursor != nil {
		token, err := pagination.EncodeTimeUUIDCursor(*nextCursor)
		if err != nil {
			return nil, err
		}
		result.NextCursor = &token
	}

	return result, nil
}