package services

import (
	"context"
	"errors"
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
	GetActivity(ctx context.Context, tripID, activityID, userID uuid.UUID) (*models.ActivityAPIResponse, error)
	GetActivitiesByTripID(ctx context.Context, tripID, userID uuid.UUID, limit int, cursorToken string) (*models.ActivityCursorPageResult, error)
	GetActivitiesByCategory(ctx context.Context, tripID, userID uuid.UUID, categoryName string, limit int, cursorToken string) (*models.ActivityCursorPageResult, error)
	UpdateActivity(ctx context.Context, tripID, activityID, userID uuid.UUID, req models.UpdateActivityRequest) (*models.ActivityAPIResponse, error)
	DeleteActivity(ctx context.Context, tripID, activityID, userID uuid.UUID) error

	// Category management on activities
	GetActivityCategories(ctx context.Context, tripID, activityID, userID uuid.UUID, limit int, cursorToken string) (*models.ActivityCategoriesPageResult, error)
	AddCategoryToActivity(ctx context.Context, tripID, activityID, userID uuid.UUID, categoryName string) error
	RemoveCategoryFromActivity(ctx context.Context, tripID, activityID, userID uuid.UUID, categoryName string) error

	// RSVP management
	UpdateActivityRSVP(ctx context.Context, tripID, activityID, userID uuid.UUID, req models.ActivityRSVPRequestPayload) (*models.ActivityRSVP, error)
	GetActivityRSVPs(ctx context.Context, tripID, activityID, userID uuid.UUID, limit int, cursorToken string, statusFilter string) (*models.ActivityRSVPsPageResult, error)
}

var _ ActivityServiceInterface = (*ActivityService)(nil)

type ActivityService struct {
	*repository.Repository
	fileService FileServiceInterface
}

func NewActivityService(repo *repository.Repository, fileService FileServiceInterface) ActivityServiceInterface {
	return &ActivityService{
		Repository:  repo,
		fileService: fileService,
	}
}

// NOTE: All activity endpoints are protected by TripMemberRequired middleware,
// which validates trip existence and user membership before reaching the service layer.
// Membership checks are intentionally omitted here to avoid redundant database queries.

// verifyActivityBelongsToTrip fetches an activity and verifies it belongs to the given trip.
// Returns ErrNotFound if the activity doesn't exist or belongs to a different trip.
func (s *ActivityService) verifyActivityBelongsToTrip(ctx context.Context, tripID, activityID uuid.UUID) (*models.ActivityDatabaseResponse, error) {
	activity, err := s.Activity.Find(ctx, activityID)
	if err != nil {
		return nil, err
	}
	if activity.TripID != tripID {
		return nil, errs.ErrNotFound
	}
	return activity, nil
}

func (s *ActivityService) CreateActivity(ctx context.Context, req models.CreateActivityRequest, userID uuid.UUID) (*models.ActivityAPIResponse, error) {
	var createdActivity *models.Activity
	err := s.Repository.GetDB().RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		activity := &models.Activity{
			TripID:         req.TripID,
			ProposedBy:     &userID,
			Name:           req.Name,
			ThumbnailURL:   req.ThumbnailURL,
			MediaURL:       req.MediaURL,
			Description:    req.Description,
			Dates:          req.Dates,
			LocationName:   req.LocationName,
			LocationLat:    req.LocationLat,
			LocationLng:    req.LocationLng,
			EstimatedPrice: req.EstimatedPrice,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}

		// Create activity
		var err error
		createdActivity, err = s.Activity.CreateActivityTx(ctx, tx, activity)
		if err != nil {
			return err
		}

		// Add categories using ActivityCategory repository, transactionally
		if len(req.CategoryNames) > 0 {
			// Ensure categories exist in the categories table first (FK requirement)
			err = s.Category.UpsertBatchTx(ctx, tx, createdActivity.TripID, req.CategoryNames)
			if err != nil {
				return err
			}
			err = s.ActivityCategory.AddCategoriesToActivityTx(ctx, tx, createdActivity.ID, createdActivity.TripID, req.CategoryNames)
			if err != nil {
				return err
			}
		}

		// Add images
		if len(req.ImageIDs) > 0 {
			err = s.Activity.AddImagesTx(ctx, tx, createdActivity.ID, req.ImageIDs)
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
	return s.GetActivity(ctx, req.TripID, createdActivity.ID, userID)
}

func (s *ActivityService) GetActivity(ctx context.Context, tripID, activityID, userID uuid.UUID) (*models.ActivityAPIResponse, error) {
	activity, err := s.verifyActivityBelongsToTrip(ctx, tripID, activityID)
	if err != nil {
		return nil, err
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

func (s *ActivityService) UpdateActivity(ctx context.Context, tripID, activityID, userID uuid.UUID, req models.UpdateActivityRequest) (*models.ActivityAPIResponse, error) {
	activity, err := s.verifyActivityBelongsToTrip(ctx, tripID, activityID)
	if err != nil {
		return nil, err
	}

	isAdmin, err := s.Membership.IsAdmin(ctx, tripID, userID)
	if err != nil {
		return nil, err
	}

	isProposer := activity.ProposedBy != nil && *activity.ProposedBy == userID
	if !isAdmin && !isProposer {
		return nil, errs.Forbidden()
	}

	err = s.Repository.GetDB().RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var err error
		_, err = s.Activity.UpdateTx(ctx, tx, activityID, &req)
		if err != nil {
			return err
		}
		if req.ImageIDs != nil {
			err = s.Activity.ReplaceImagesTx(ctx, tx, activityID, *req.ImageIDs)
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.GetActivity(ctx, tripID, activityID, userID)
}

func (s *ActivityService) DeleteActivity(ctx context.Context, tripID, activityID, userID uuid.UUID) error {
	activity, err := s.verifyActivityBelongsToTrip(ctx, tripID, activityID)
	if err != nil {
		return err
	}

	isAdmin, err := s.Membership.IsAdmin(ctx, activity.TripID, userID)
	if err != nil {
		return err
	}

	isProposer := activity.ProposedBy != nil && *activity.ProposedBy == userID
	if !isAdmin && !isProposer {
		return errs.Forbidden()
	}

	// activity_images rows are cleaned up automatically via ON DELETE CASCADE
	return s.Activity.Delete(ctx, activityID)
}

// GetActivityCategories retrieves categories for an activity with pagination
func (s *ActivityService) GetActivityCategories(ctx context.Context, tripID, activityID, userID uuid.UUID, limit int, cursorToken string) (*models.ActivityCategoriesPageResult, error) {
	// Verify activity belongs to trip
	if _, err := s.verifyActivityBelongsToTrip(ctx, tripID, activityID); err != nil {
		return nil, err
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
func (s *ActivityService) AddCategoryToActivity(ctx context.Context, tripID, activityID, userID uuid.UUID, categoryName string) error {
	// Verify activity belongs to trip
	activity, err := s.verifyActivityBelongsToTrip(ctx, tripID, activityID)
	if err != nil {
		return err
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
func (s *ActivityService) RemoveCategoryFromActivity(ctx context.Context, tripID, activityID, userID uuid.UUID, categoryName string) error {
	// Verify activity belongs to trip
	if _, err := s.verifyActivityBelongsToTrip(ctx, tripID, activityID); err != nil {
		return err
	}

	return s.ActivityCategory.RemoveCategoryFromActivity(ctx, activityID, categoryName)
}

// Helper methods

// buildActivityListResponse fetches categories and file URLs, then builds the paginated response
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

	apiActivities := s.convertToAPIActivities(ctx, activities, fileURLMap)

	return s.buildActivityPageResult(apiActivities, nextCursor, limit)
}

func mapToAPIResponse(activity *models.ActivityDatabaseResponse, proposerPictureURL *string) *models.ActivityAPIResponse {
	return &models.ActivityAPIResponse{
		ID:                 activity.ID,
		TripID:             activity.TripID,
		ProposedBy:         activity.ProposedBy,
		Name:               activity.Name,
		ThumbnailURL:       activity.ThumbnailURL,
		MediaURL:           activity.MediaURL,
		Description:        activity.Description,
		Dates:              activity.Dates,
		LocationName:       activity.LocationName,
		LocationLat:        activity.LocationLat,
		LocationLng:        activity.LocationLng,
		EstimatedPrice:     activity.EstimatedPrice,
		CreatedAt:          activity.CreatedAt,
		UpdatedAt:          activity.UpdatedAt,
		ProposerUsername:   activity.ProposerUsername,
		ProposerPictureURL: proposerPictureURL,
		CategoryNames:      activity.CategoryNames,
	}
}

func (s *ActivityService) toAPIResponse(ctx context.Context, activity *models.ActivityDatabaseResponse) (*models.ActivityAPIResponse, error) {
	var proposerPictureURL *string
	if activity.ProposerPictureID != nil {
		fileResp, err := s.fileService.GetFile(ctx, *activity.ProposerPictureID, models.ImageSizeSmall)
		if err == nil {
			proposerPictureURL = &fileResp.URL
		}
	}

	// Fetch presigned URLs for activity images
	imageResponses := make([]models.ActivityImageResponse, 0, len(activity.ImageKeys))
	for _, imageID := range activity.ImageKeys {
		img := models.ActivityImageResponse{ImageID: imageID}
		if fileResp, err := s.fileService.GetFile(ctx, imageID, models.ImageSizeMedium); err == nil {
			img.ImageURL = fileResp.URL
		}
		imageResponses = append(imageResponses, img)
	}

	apiResp := mapToAPIResponse(activity, proposerPictureURL)
	apiResp.Images = imageResponses
	return apiResp, nil
}

func (s *ActivityService) convertToAPIActivities(ctx context.Context, activities []*models.ActivityDatabaseResponse, fileURLMap map[string]string) []*models.ActivityAPIResponse {
	apiActivities := make([]*models.ActivityAPIResponse, 0, len(activities))
	for _, activity := range activities {
		var proposerPictureURL *string
		if activity.ProposerPictureKey != nil && *activity.ProposerPictureKey != "" {
			if url, exists := fileURLMap[*activity.ProposerPictureKey]; exists {
				proposerPictureURL = &url
			}
		}
		// Fetch presigned URLs for activity images
		imageResponses := make([]models.ActivityImageResponse, 0, len(activity.ImageKeys))
		for _, imageID := range activity.ImageKeys {
			img := models.ActivityImageResponse{ImageID: imageID}
			if fileResp, err := s.fileService.GetFile(ctx, imageID, models.ImageSizeMedium); err == nil {
				img.ImageURL = fileResp.URL
			}
			imageResponses = append(imageResponses, img)
		}
		apiResp := mapToAPIResponse(activity, proposerPictureURL)
		apiResp.Images = imageResponses
		apiActivities = append(apiActivities, apiResp)
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

func (s *ActivityService) UpdateActivityRSVP(ctx context.Context, tripID, activityID, userID uuid.UUID, req models.ActivityRSVPRequestPayload) (*models.ActivityRSVP, error) {
	if _, err := s.verifyActivityBelongsToTrip(ctx, tripID, activityID); err != nil {
		return nil, err
	}

	rsvp, err := s.ActivityRSVP.UpdateRSVP(ctx, tripID, activityID, userID, req.Status)
	if err != nil {
		return nil, err
	}
	return rsvp, nil
}

func (s *ActivityService) GetActivityRSVPs(
	ctx context.Context,
	tripID uuid.UUID,
	activityID uuid.UUID,
	userID uuid.UUID,
	limit int,
	cursorToken string,
	statusFilter string,
) (*models.ActivityRSVPsPageResult, error) {

	if _, err := s.verifyActivityBelongsToTrip(ctx, tripID, activityID); err != nil {
		return nil, err
	}

	cursor, err := pagination.DecodeTimeCursor(cursorToken)
	if err != nil {
		return nil, errs.BadRequest(errors.New("invalid cursor format"))
	}

	rsvps, lastCreatedAt, err := s.ActivityRSVP.GetActivityRSVPs(
		ctx,
		tripID,
		activityID,
		userID,
		limit,
		cursor,
		statusFilter,
	)
	if err != nil {
		return nil, err
	}

	fileURLMap := pagination.FetchFileURLs(
		ctx,
		s.fileService,
		rsvps,
		func(item models.ActivityRSVPDatabaseResponse) *string {
			return item.ProfilePictureKey
		},
		models.ImageSizeSmall,
	)

	apiRSVPs := make([]models.ActivityRSVPAPIResponse, 0, len(rsvps))
	for _, rsvp := range rsvps {
		apiRSVPs = append(apiRSVPs, toRSVPAPIResponse(rsvp, fileURLMap))
	}

	var nextCursor *string
	if !lastCreatedAt.IsZero() {
		token := lastCreatedAt.Format(time.RFC3339Nano)
		nextCursor = &token
	}

	return &models.ActivityRSVPsPageResult{
		RSVPs:      apiRSVPs,
		Limit:      limit,
		NextCursor: nextCursor,
	}, nil
}

func toRSVPAPIResponse(
	rsvp models.ActivityRSVPDatabaseResponse,
	fileURLMap map[string]string,
) models.ActivityRSVPAPIResponse {

	var profilePictureURL *string

	if rsvp.ProfilePictureKey != nil && *rsvp.ProfilePictureKey != "" {
		if url, exists := fileURLMap[*rsvp.ProfilePictureKey]; exists {
			profilePictureURL = &url
		}
	}

	return models.ActivityRSVPAPIResponse{
		UserID:            rsvp.UserID,
		Username:          rsvp.Username,
		ActivityID:        rsvp.ActivityID,
		ProfilePictureURL: profilePictureURL,
		Status:            rsvp.Status,
		CreatedAt:         rsvp.CreatedAt,
		UpdatedAt:         rsvp.UpdatedAt,
	}
}
