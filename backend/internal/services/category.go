package services

import (
	"context"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/google/uuid"
)

type CategoryServiceInterface interface {
	GetCategoriesByTripID(ctx context.Context, tripID, userID uuid.UUID) ([]*models.CategoryAPIResponse, error)
}

var _ CategoryServiceInterface = (*CategoryService)(nil)

type CategoryService struct {
	*repository.Repository
}

func NewCategoryService(repo *repository.Repository) CategoryServiceInterface {
	return &CategoryService{
		Repository: repo,
	}
}

func (s *CategoryService) GetCategoriesByTripID(ctx context.Context, tripID, userID uuid.UUID) ([]*models.CategoryAPIResponse, error) {
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

	categories, err := s.Category.FindByTripID(ctx, tripID)
	if err != nil {
		return nil, err
	}

	return s.convertToAPICategories(categories), nil
}

func (s *CategoryService) convertToAPICategories(categories []*models.Category) []*models.CategoryAPIResponse {
	apiCategories := make([]*models.CategoryAPIResponse, 0, len(categories))
	for _, category := range categories {
		apiCategories = append(apiCategories, &models.CategoryAPIResponse{
			TripID:    category.TripID,
			Name:      category.Name,
			Icon:      category.Icon,
			CreatedAt: category.CreatedAt,
			UpdatedAt: category.UpdatedAt,
		})
	}
	return apiCategories
}