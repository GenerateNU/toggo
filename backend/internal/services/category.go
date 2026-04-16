package services

import (
	"context"
	"errors"
	"log"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/realtime"
	"toggo/internal/repository"

	"github.com/google/uuid"
)

type CategoryServiceInterface interface {
	GetCategoriesByTripID(ctx context.Context, tripID, userID uuid.UUID, includeHidden bool) ([]*models.CategoryAPIResponse, error)
	SetCategoryVisibility(ctx context.Context, tripID, userID uuid.UUID, name string, isHidden bool) error
	GetTabs(ctx context.Context, tripID, userID uuid.UUID) ([]*models.CategoryAPIResponse, error)
	ReorderTabs(ctx context.Context, tripID, userID uuid.UUID, req models.UpdateCategoryTabOrderRequest) error
	CreateCategory(ctx context.Context, tripID, userID uuid.UUID, req models.CreateCategoryRequest) (*models.CategoryAPIResponse, error)
	DeleteCategory(ctx context.Context, tripID, userID uuid.UUID, name string) error
}

var _ CategoryServiceInterface = (*CategoryService)(nil)

type CategoryService struct {
	*repository.Repository
	publisher realtime.EventPublisher
}

func NewCategoryService(repo *repository.Repository, publisher realtime.EventPublisher) CategoryServiceInterface {
	return &CategoryService{
		Repository: repo,
		publisher:  publisher,
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

func (s *CategoryService) CreateCategory(ctx context.Context, tripID, userID uuid.UUID, req models.CreateCategoryRequest) (*models.CategoryAPIResponse, error) {
	_, err := s.Trip.Find(ctx, tripID)
	if err != nil {
		return nil, errs.ErrNotFound
	}

	isMember, err := s.Membership.IsMember(ctx, tripID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errs.Forbidden()
	}

	exists, err := s.Category.Exists(ctx, tripID, req.Name)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errs.BadRequest(errors.New("category with this name already exists"))
	}

	count, err := s.Category.CountByTripID(ctx, tripID)
	if err != nil {
		return nil, err
	}

	viewType := models.CategoryViewTypeActivity
	if req.ViewType != nil && *req.ViewType == models.CategoryViewTypeMoodboard {
		viewType = models.CategoryViewTypeMoodboard
	}

	category := &models.Category{
		TripID:    tripID,
		Name:      req.Name,
		Label:     req.Label,
		Icon:      req.Icon,
		IsDefault: false,
		ViewType:  viewType,
		Position:  count,
	}

	created, err := s.Category.Create(ctx, category)
	if err != nil {
		return nil, err
	}

	s.publishCategoryCreated(ctx, tripID.String(), userID.String(), created)

	return s.toAPIResponse(created), nil
}

func (s *CategoryService) publishCategoryCreated(ctx context.Context, tripID, actorID string, category *models.Category) {
	if s.publisher == nil {
		return
	}
	event, err := realtime.NewEventWithActor(realtime.EventTopicCategoryCreated, tripID, category.Name, actorID, "", category)
	if err != nil {
		log.Printf("Failed to create category.created event: %v", err)
		return
	}
	if err := s.publisher.Publish(ctx, event); err != nil {
		log.Printf("Failed to publish category.created event: %v", err)
	}
}

func (s *CategoryService) DeleteCategory(ctx context.Context, tripID, userID uuid.UUID, name string) error {
	isAdmin, err := s.Membership.IsAdmin(ctx, tripID, userID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errs.Forbidden()
	}

	category, err := s.Category.Find(ctx, tripID, name)
	if err != nil {
		return err
	}

	if category.IsDefault {
		return errs.BadRequest(errors.New("cannot delete a default category, use hide instead"))
	}

	return s.Category.Delete(ctx, tripID, name)
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

// ReorderTabs updates the position of all categories for a trip
func (s *CategoryService) ReorderTabs(ctx context.Context, tripID, userID uuid.UUID, req models.UpdateCategoryTabOrderRequest) error {
	isMember, err := s.Membership.IsMember(ctx, tripID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errs.ErrNotFound
	}

	// Fetch all categories (visible and hidden) for validation
	currentCategories, err := s.Category.FindByTripID(ctx, tripID, true)
	if err != nil {
		return err
	}

	if len(req.Tabs) != len(currentCategories) {
		return errs.BadRequest(errors.New("reorder request must include all tabs exactly once"))
	}

	// Build lookup of all category names for this trip
	currentNames := make(map[string]bool)
	for _, c := range currentCategories {
		currentNames[c.Name] = true
	}

	// Validate no duplicates and all names belong to this trip
	seenNames := make(map[string]bool)
	seenPositions := make(map[int]bool)
	for _, t := range req.Tabs {
		if !currentNames[t.Name] {
			return errs.BadRequest(errors.New("category does not belong to this trip"))
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

func (s *CategoryService) toAPIResponse(category *models.Category) *models.CategoryAPIResponse {
	vt := category.ViewType
	if vt == "" {
		vt = models.CategoryViewTypeActivity
	}
	return &models.CategoryAPIResponse{
		TripID:    category.TripID,
		Name:      category.Name,
		Label:     category.Label,
		Icon:      category.Icon,
		IsDefault: category.IsDefault,
		ViewType:  vt,
		Position:  category.Position,
		CreatedAt: category.CreatedAt,
		UpdatedAt: category.UpdatedAt,
	}
}

func (s *CategoryService) convertToAPICategories(categories []*models.Category) []*models.CategoryAPIResponse {
	apiCategories := make([]*models.CategoryAPIResponse, 0, len(categories))
	for _, category := range categories {
		apiCategories = append(apiCategories, s.toAPIResponse(category))
	}
	return apiCategories
}

func (s *CategoryService) convertToAPICategoriesWithHidden(categories []*models.Category) []*models.CategoryAPIResponse {
	apiCategories := make([]*models.CategoryAPIResponse, 0, len(categories))
	for _, category := range categories {
		isHidden := category.IsHidden
		resp := s.toAPIResponse(category)
		resp.IsHidden = &isHidden
		apiCategories = append(apiCategories, resp)
	}
	return apiCategories
}
