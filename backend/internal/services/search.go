package services

import (
	"context"
	"toggo/internal/models"
	"toggo/internal/repository"
	"toggo/internal/utilities/pagination"

	"github.com/google/uuid"
)

// SearchServiceInterface exposes search operations for trips, activities, and trip members.
type SearchServiceInterface interface {
	SearchTrips(ctx context.Context, userID uuid.UUID, query string, limit, offset int) (*models.SearchTripsResult, error)
	SearchActivities(ctx context.Context, tripID uuid.UUID, query string, limit, offset int) (*models.SearchActivitiesResult, error)
	SearchTripMembers(ctx context.Context, tripID uuid.UUID, query string, limit, offset int) (*models.SearchMembersResult, error)
}

var _ SearchServiceInterface = (*SearchService)(nil)

// SearchService implements SearchServiceInterface.
type SearchService struct {
	*repository.Repository
	fileService FileServiceInterface
}

// NewSearchService creates a new SearchService.
func NewSearchService(repo *repository.Repository, fileService FileServiceInterface) SearchServiceInterface {
	return &SearchService{
		Repository:  repo,
		fileService: fileService,
	}
}

// SearchTrips searches trips the user is a member of using PostgreSQL full-text search.
func (s *SearchService) SearchTrips(ctx context.Context, userID uuid.UUID, query string, limit, offset int) (*models.SearchTripsResult, error) {
	rows, total, err := s.Search.SearchTrips(ctx, userID, query, limit, offset)
	if err != nil {
		return nil, err
	}

	fileURLMap := pagination.FetchFileURLs(ctx, s.fileService, rows, func(item *models.TripDatabaseResponse) *string {
		return item.CoverImageKey
	}, models.ImageSizeMedium)

	items := make([]*models.TripAPIResponse, 0, len(rows))
	for _, row := range rows {
		var coverImageURL *string
		if row.CoverImageKey != nil && *row.CoverImageKey != "" {
			if u, ok := fileURLMap[*row.CoverImageKey]; ok {
				coverImageURL = &u
			}
		}
		items = append(items, &models.TripAPIResponse{
			ID:            row.TripID,
			Name:          row.Name,
			CoverImageURL: coverImageURL,
			BudgetMin:     row.BudgetMin,
			BudgetMax:     row.BudgetMax,
			Currency:      row.Currency,
			CreatedAt:     row.CreatedAt,
			UpdatedAt:     row.UpdatedAt,
		})
	}

	return &models.SearchTripsResult{
		Items:  items,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}, nil
}

// SearchActivities searches activities within a trip using PostgreSQL full-text search.
func (s *SearchService) SearchActivities(ctx context.Context, tripID uuid.UUID, query string, limit, offset int) (*models.SearchActivitiesResult, error) {
	rows, total, err := s.Search.SearchActivities(ctx, tripID, query, limit, offset)
	if err != nil {
		return nil, err
	}

	// fetch categories in batch
	activityIDs := make([]uuid.UUID, len(rows))
	for i, row := range rows {
		activityIDs[i] = row.ID
	}
	categoriesMap, err := s.ActivityCategory.GetCategoriesForActivities(ctx, activityIDs)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		if cats, ok := categoriesMap[row.ID]; ok {
			row.CategoryNames = cats
		} else {
			row.CategoryNames = []string{}
		}
	}

	// fetch proposer picture URLs in batches
	fileURLMap := pagination.FetchFileURLs(ctx, s.fileService, rows, func(item *models.ActivityDatabaseResponse) *string {
		return item.ProposerPictureKey
	}, models.ImageSizeSmall)

	items := make([]*models.ActivityAPIResponse, 0, len(rows))
	for _, row := range rows {
		var proposerPictureURL *string
		if row.ProposerPictureKey != nil && *row.ProposerPictureKey != "" {
			if u, ok := fileURLMap[*row.ProposerPictureKey]; ok {
				proposerPictureURL = &u
			}
		}
		items = append(items, &models.ActivityAPIResponse{
			ID:                 row.ID,
			TripID:             row.TripID,
			ProposedBy:         row.ProposedBy,
			Name:               row.Name,
			ThumbnailURL:       row.ThumbnailURL,
			MediaURL:           row.MediaURL,
			Description:        row.Description,
			Dates:              row.Dates,
			CreatedAt:          row.CreatedAt,
			UpdatedAt:          row.UpdatedAt,
			ProposerUsername:   row.ProposerUsername,
			ProposerPictureURL: proposerPictureURL,
			CategoryNames:      row.CategoryNames,
		})
	}

	return &models.SearchActivitiesResult{
		Items:  items,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}, nil
}

// SearchTripMembers searches members of a trip by name or username using full-text search.
func (s *SearchService) SearchTripMembers(ctx context.Context, tripID uuid.UUID, query string, limit, offset int) (*models.SearchMembersResult, error) {
	rows, total, err := s.Search.SearchTripMembers(ctx, tripID, query, limit, offset)
	if err != nil {
		return nil, err
	}

	fileURLMap := pagination.FetchFileURLs(ctx, s.fileService, rows, func(item *models.MembershipDatabaseResponse) *string {
		return item.ProfilePictureKey
	}, models.ImageSizeSmall)

	items := make([]*models.MembershipAPIResponse, 0, len(rows))
	for _, row := range rows {
		var profilePictureURL *string
		if row.ProfilePictureKey != nil && *row.ProfilePictureKey != "" {
			if u, ok := fileURLMap[*row.ProfilePictureKey]; ok {
				profilePictureURL = &u
			}
		}
		items = append(items, &models.MembershipAPIResponse{
			UserID:            row.UserID,
			TripID:            row.TripID,
			IsAdmin:           row.IsAdmin,
			CreatedAt:         row.CreatedAt,
			UpdatedAt:         row.UpdatedAt,
			BudgetMin:         row.BudgetMin,
			BudgetMax:         row.BudgetMax,
			Availability:      row.Availability,
			Username:          row.Username,
			ProfilePictureURL: profilePictureURL,
		})
	}

	return &models.SearchMembersResult{
		Items:  items,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}, nil
}
