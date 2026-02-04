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
)

type MembershipServiceInterface interface {
	AddMember(ctx context.Context, req models.CreateMembershipRequest) (*models.Membership, error)
	GetMembership(ctx context.Context, tripID, userID uuid.UUID) (*models.MembershipAPIResponse, error)
	GetTripMembers(ctx context.Context, tripID uuid.UUID, limit int, cursorToken string) (*models.MembershipCursorPageResult, error)
	GetUserTrips(ctx context.Context, userID uuid.UUID) ([]*models.Membership, error)
	UpdateMembership(ctx context.Context, userID, tripID uuid.UUID, req models.UpdateMembershipRequest) (*models.Membership, error)
	RemoveMember(ctx context.Context, tripID, userID uuid.UUID) error
	PromoteToAdmin(ctx context.Context, tripID, userID uuid.UUID) error
	DemoteFromAdmin(ctx context.Context, tripID, userID uuid.UUID) error
	IsMember(ctx context.Context, tripID, userID uuid.UUID) (bool, error)
	IsAdmin(ctx context.Context, tripID, userID uuid.UUID) (bool, error)
	GetMemberCount(ctx context.Context, tripID uuid.UUID) (int, error)
}

var _ MembershipServiceInterface = (*MembershipService)(nil)

type MembershipService struct {
	*repository.Repository
	fileService FileServiceInterface
}

func NewMembershipService(repo *repository.Repository, fileService FileServiceInterface) MembershipServiceInterface {
	return &MembershipService{
		Repository:  repo,
		fileService: fileService,
	}
}

func (s *MembershipService) AddMember(ctx context.Context, req models.CreateMembershipRequest) (*models.Membership, error) {
	// Validate trip exists
	_, err := s.Trip.Find(ctx, req.TripID)
	if err != nil {
		return nil, errs.ErrNotFound
	}

	// Validate business rules
	if req.BudgetMin < 0 {
		return nil, errs.BadRequest(errors.New("budget minimum cannot be negative"))
	}

	if req.BudgetMax < req.BudgetMin {
		return nil, errs.BadRequest(errors.New("budget maximum must be greater than or equal to minimum"))
	}

	existingMembership, err := s.Membership.Find(ctx, req.UserID, req.TripID)
	if err == nil {
		return &models.Membership{
			UserID:       existingMembership.UserID,
			TripID:       existingMembership.TripID,
			IsAdmin:      existingMembership.IsAdmin,
			BudgetMin:    existingMembership.BudgetMin,
			BudgetMax:    existingMembership.BudgetMax,
			Availability: existingMembership.Availability,
			CreatedAt:    existingMembership.CreatedAt,
			UpdatedAt:    existingMembership.UpdatedAt,
		}, nil
	}

	// Create membership
	membership := &models.Membership{
		UserID:    req.UserID,
		TripID:    req.TripID,
		IsAdmin:   req.IsAdmin,
		BudgetMin: req.BudgetMin,
		BudgetMax: req.BudgetMax,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	return s.Membership.Create(ctx, membership)
}

func (s *MembershipService) GetMembership(ctx context.Context, tripID, userID uuid.UUID) (*models.MembershipAPIResponse, error) {
	membership, err := s.Membership.Find(ctx, userID, tripID)
	if err != nil {
		return nil, err
	}
	if membership == nil {
		return nil, errs.ErrNotFound
	}

	return s.toAPIResponse(ctx, membership)
}

func (s *MembershipService) GetTripMembers(ctx context.Context, tripID uuid.UUID, limit int, cursorToken string) (*models.MembershipCursorPageResult, error) {
	cursor, err := pagination.ParseCursor(cursorToken)
	if err != nil {
		return nil, err
	}

	memberships, nextCursor, err := s.Membership.FindByTripIDWithCursor(ctx, tripID, limit, cursor)
	if err != nil {
		return nil, err
	}

	fileURLMap := pagination.FetchFileURLs(ctx, s.fileService, memberships, func(item *models.MembershipDatabaseResponse) *string {
		return item.ProfilePictureKey
	}, models.ImageSizeSmall)
	apiMemberships := s.convertToAPIMemberships(memberships, fileURLMap)

	return s.buildMembershipPageResult(apiMemberships, nextCursor, limit)
}

func (s *MembershipService) GetUserTrips(ctx context.Context, userID uuid.UUID) ([]*models.Membership, error) {
	return s.Membership.FindByUserID(ctx, userID)
}

func (s *MembershipService) UpdateMembership(ctx context.Context, userID, tripID uuid.UUID, req models.UpdateMembershipRequest) (*models.Membership, error) {
	membership, err := s.Membership.Find(ctx, userID, tripID)
	if err != nil {
		return nil, err
	}

	// Determine final budget values (use existing if not provided)
	budgetMin := membership.BudgetMin
	budgetMax := membership.BudgetMax

	if req.BudgetMin != nil {
		budgetMin = *req.BudgetMin
	}

	if req.BudgetMax != nil {
		budgetMax = *req.BudgetMax
	}

	// Validate business rules with final values
	if budgetMin < 0 {
		return nil, errors.New("budget minimum cannot be negative")
	}

	if budgetMax < budgetMin {
		return nil, errors.New("budget maximum must be greater than or equal to minimum")
	}

	// Update with validated request
	return s.Membership.Update(ctx, userID, tripID, &req)
}

func (s *MembershipService) RemoveMember(ctx context.Context, tripID, userID uuid.UUID) error {
	// Check if member exists
	isMember, err := s.Membership.IsMember(ctx, tripID, userID)
	if err != nil {
		return err
	}

	if !isMember {
		return errors.New("user is not a member of this trip")
	}

	return s.Membership.Delete(ctx, userID, tripID)
}

func (s *MembershipService) PromoteToAdmin(ctx context.Context, tripID, userID uuid.UUID) error {
	// Get membership
	membership, err := s.Membership.Find(ctx, userID, tripID)
	if err != nil {
		return errors.New("user is not a member of this trip")
	}

	if membership.IsAdmin {
		return errors.New("user is already an admin")
	}

	// Update to admin using pointer
	isAdmin := true
	updateReq := models.UpdateMembershipRequest{
		IsAdmin: &isAdmin,
	}

	_, err = s.Membership.Update(ctx, userID, tripID, &updateReq)
	return err
}

func (s *MembershipService) DemoteFromAdmin(ctx context.Context, tripID, userID uuid.UUID) error {
	// Get membership
	membership, err := s.Membership.Find(ctx, userID, tripID)
	if err != nil {
		return errors.New("user is not a member of this trip")
	}

	if !membership.IsAdmin {
		return errors.New("user is not an admin")
	}

	// Check if this is the last admin
	admins, err := s.Membership.CountAdmins(ctx, tripID)
	if err != nil {
		return err
	}
	if admins <= 1 {
		return errs.BadRequest(errors.New("cannot demote the last admin"))
	}

	// Update to non-admin using pointer
	isAdmin := false
	updateReq := models.UpdateMembershipRequest{
		IsAdmin: &isAdmin,
	}

	_, err = s.Membership.Update(ctx, userID, tripID, &updateReq)
	return err
}

func (s *MembershipService) IsMember(ctx context.Context, tripID, userID uuid.UUID) (bool, error) {
	return s.Membership.IsMember(ctx, tripID, userID)
}

func (s *MembershipService) IsAdmin(ctx context.Context, tripID, userID uuid.UUID) (bool, error) {
	return s.Membership.IsAdmin(ctx, tripID, userID)
}

func (s *MembershipService) GetMemberCount(ctx context.Context, tripID uuid.UUID) (int, error) {
	return s.Membership.CountMembers(ctx, tripID)
}

func (s *MembershipService) toAPIResponse(ctx context.Context, membership *models.MembershipDatabaseResponse) (*models.MembershipAPIResponse, error) {
	var profilePictureURL *string
	if membership.ProfilePictureID != nil {
		fileResp, err := s.fileService.GetFile(ctx, *membership.ProfilePictureID, models.ImageSizeSmall)
		if err == nil {
			profilePictureURL = &fileResp.URL
		}
	}

	return &models.MembershipAPIResponse{
		UserID:            membership.UserID,
		TripID:            membership.TripID,
		IsAdmin:           membership.IsAdmin,
		CreatedAt:         membership.CreatedAt,
		UpdatedAt:         membership.UpdatedAt,
		BudgetMin:         membership.BudgetMin,
		BudgetMax:         membership.BudgetMax,
		Availability:      membership.Availability,
		Username:          membership.Username,
		ProfilePictureURL: profilePictureURL,
	}, nil
}

// Helper methods for cleaner code organization

func (s *MembershipService) convertToAPIMemberships(memberships []*models.MembershipDatabaseResponse, fileURLMap map[string]string) []*models.MembershipAPIResponse {
	apiMemberships := make([]*models.MembershipAPIResponse, 0, len(memberships))
	for _, membership := range memberships {
		var profilePictureURL *string
		if membership.ProfilePictureKey != nil && *membership.ProfilePictureKey != "" {
			if url, exists := fileURLMap[*membership.ProfilePictureKey]; exists {
				profilePictureURL = &url
			}
		}

		apiMemberships = append(apiMemberships, &models.MembershipAPIResponse{
			UserID:            membership.UserID,
			TripID:            membership.TripID,
			IsAdmin:           membership.IsAdmin,
			CreatedAt:         membership.CreatedAt,
			UpdatedAt:         membership.UpdatedAt,
			BudgetMin:         membership.BudgetMin,
			BudgetMax:         membership.BudgetMax,
			Availability:      membership.Availability,
			Username:          membership.Username,
			ProfilePictureURL: profilePictureURL,
		})
	}
	return apiMemberships
}

func (s *MembershipService) buildMembershipPageResult(apiMemberships []*models.MembershipAPIResponse, nextCursor *models.MembershipCursor, limit int) (*models.MembershipCursorPageResult, error) {
	result := &models.MembershipCursorPageResult{
		Items: apiMemberships,
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
