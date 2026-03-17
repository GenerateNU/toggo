package services

import (
	"context"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/google/uuid"
)

type CategoryServiceInterface interface {
	GetCategoriesByTripID(ctx context.Context, tripID, userID uuid.UUID, includeHidden bool) ([]*models.CategoryAPIResponse, error)
	SetCategoryVisibility(ctx context.Context, tripID, userID uuid.UUID, name string, isHidden bool) error
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

func (s *CategoryService) GetCategoriesByTripID(ctx context.Context, tripID, userID uuid.UUID, includeHidden bool) ([]*models.CategoryAPIResponse, error) {
	_, err := s.Trip.Find(ctx, tripID)
	if err != nil {
		return nil, errs.ErrNotFound
	}

	isAdmin, err := s.Membership.IsAdmin(ctx, tripID, userID)
	if err != nil {
		return nil, err
	}

	if isAdmin && includeHidden {
		categories, err := s.Category.FindByTripID(ctx, tripID, true)
		if err != nil {
			return nil, err
		}
		return s.convertToAPICategoriesWithHidden(categories), nil
	}

	if !isAdmin {
		isMember, err := s.Membership.IsMember(ctx, tripID, userID)
		if err != nil {
			return nil, err
		}
		if !isMember {
			return nil, errs.ErrNotFound
		}
	}

	categories, err := s.Category.FindByTripID(ctx, tripID, false)
	if err != nil {
		return nil, err
	}

	return s.convertToAPICategories(categories), nil
}

func (s *CategoryService) SetCategoryVisibility(ctx context.Context, tripID, userID uuid.UUID, name string, isHidden bool) error {
	isAdmin, err := s.Membership.IsAdmin(ctx, tripID, userID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errs.Forbidden()
	}

	if _, err := s.Category.Find(ctx, tripID, name); err != nil {
		return err
	}

	return s.Category.SetHidden(ctx, tripID, name, isHidden)
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

func (s *CategoryService) convertToAPICategoriesWithHidden(categories []*models.Category) []*models.CategoryAPIResponse {
	apiCategories := make([]*models.CategoryAPIResponse, 0, len(categories))
	for _, category := range categories {
		isHidden := category.IsHidden
		apiCategories = append(apiCategories, &models.CategoryAPIResponse{
			TripID:    category.TripID,
			Name:      category.Name,
			Icon:      category.Icon,
			IsHidden:  &isHidden,
			CreatedAt: category.CreatedAt,
			UpdatedAt: category.UpdatedAt,
		})
	}
	return apiCategories
}
