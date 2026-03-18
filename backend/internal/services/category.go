package services

import (
	"context"
	"errors"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/google/uuid"
)

type CategoryServiceInterface interface {
	GetCategoriesByTripID(ctx context.Context, tripID, userID uuid.UUID, includeHidden bool) ([]*models.CategoryAPIResponse, error)
	SetCategoryVisibility(ctx context.Context, tripID, userID uuid.UUID, name string, isHidden bool) error
	GetTabs(ctx context.Context, tripID, userID uuid.UUID) ([]*models.CategoryAPIResponse, error)
	ReorderTabs(ctx context.Context, tripID, userID uuid.UUID, req models.UpdateCategoryTabOrderRequest) error
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

// GetTabs returns all visible (non-hidden) categories for a trip ordered by position
func (s *CategoryService) GetTabs(ctx context.Context, tripID, userID uuid.UUID) ([]*models.CategoryAPIResponse, error) {
	isMember, err := s.Membership.IsMember(ctx, tripID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errs.ErrNotFound
	}

	categories, err := s.Category.FindByTripID(ctx, tripID, false)
	if err != nil {
		return nil, err
	}

	return s.convertToAPICategories(categories), nil
}

// ReorderTabs updates the position of all visible categories for a trip
func (s *CategoryService) ReorderTabs(ctx context.Context, tripID, userID uuid.UUID, req models.UpdateCategoryTabOrderRequest) error {
	isMember, err := s.Membership.IsMember(ctx, tripID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errs.ErrNotFound
	}

	// Fetch only visible categories for validation
	currentCategories, err := s.Category.FindByTripID(ctx, tripID, false)
	if err != nil {
		return err
	}

	if len(req.Tabs) != len(currentCategories) {
		return errs.BadRequest(errors.New("reorder request must include all visible tabs exactly once"))
	}

	// Build lookup of current visible category names
	currentNames := make(map[string]bool)
	for _, c := range currentCategories {
		currentNames[c.Name] = true
	}

	// Validate no duplicates and all names belong to this trip
	seenNames := make(map[string]bool)
	seenPositions := make(map[int]bool)
	for _, t := range req.Tabs {
		if !currentNames[t.Name] {
			return errs.BadRequest(errors.New("category does not belong to this trip or is hidden"))
		}
		if seenNames[t.Name] {
			return errs.BadRequest(errors.New("duplicate category names in reorder request"))
		}
		if seenPositions[t.Position] {
			return errs.BadRequest(errors.New("duplicate positions in reorder request"))
		}
		seenNames[t.Name] = true
		seenPositions[t.Position] = true
	}

	return s.Category.UpdateOrder(ctx, tripID, req.Tabs)
}

func (s *CategoryService) convertToAPICategories(categories []*models.Category) []*models.CategoryAPIResponse {
	apiCategories := make([]*models.CategoryAPIResponse, 0, len(categories))
	for _, category := range categories {
		apiCategories = append(apiCategories, &models.CategoryAPIResponse{
			TripID:    category.TripID,
			Name:      category.Name,
			Icon:      category.Icon,
			Position:  category.Position,
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
			Position:  category.Position,
			CreatedAt: category.CreatedAt,
			UpdatedAt: category.UpdatedAt,
		})
	}
	return apiCategories
}