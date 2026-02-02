package services

import (
	"context"
	"errors"
	"time"
	"toggo/internal/config"
	"toggo/internal/errs"
	"toggo/internal/interfaces"
	"toggo/internal/models"
	"toggo/internal/repository"
	"toggo/internal/utilities/pagination"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"golang.org/x/sync/errgroup"
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
	presignClient interfaces.S3PresignClient
	bucketName    string
	urlExpiration time.Duration
}

func NewMembershipService(repo *repository.Repository, cfg *config.Configuration) MembershipServiceInterface {
	service := &MembershipService{
		Repository:    repo,
		urlExpiration: 15 * time.Minute,
	}

	if cfg != nil {
		service.presignClient = cfg.AWS.PresignClient
		service.bucketName = cfg.AWS.BucketName
	}

	return service
}

func (s *MembershipService) AddMember(ctx context.Context, req models.CreateMembershipRequest) (*models.Membership, error) {
	// Validate trip exists
	_, err := s.Trip.Find(ctx, req.TripID)
	if err != nil {
		return nil, errors.New("trip not found")
	}

	// Validate business rules
	if req.BudgetMin < 0 {
		return nil, errors.New("budget minimum cannot be negative")
	}

	if req.BudgetMax < req.BudgetMin {
		return nil, errors.New("budget maximum must be greater than or equal to minimum")
	}

	// Check if already a member
	isMember, err := s.Membership.IsMember(ctx, req.TripID, req.UserID)
	if err != nil {
		return nil, err
	}
	if isMember {
		return nil, errors.New("user is already a member of this trip")
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
	var cursor *models.MembershipCursor
	if cursorToken != "" {
		decoded, err := pagination.DecodeTimeUUIDCursor(cursorToken)
		if err != nil {
			return nil, err
		}
		cursor = decoded
	}

	memberships, nextCursor, err := s.Membership.FindByTripIDWithCursor(ctx, tripID, limit, cursor)
	if err != nil {
		return nil, err
	}

	apiMemberships := make([]*models.MembershipAPIResponse, len(memberships))

	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(10)

	for i := range memberships {
		i := i
		membership := memberships[i]
		g.Go(func() error {
			apiMembership, convErr := s.toAPIResponse(ctx, membership)
			if convErr != nil {
				return convErr
			}
			apiMemberships[i] = apiMembership
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

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

func (s *MembershipService) GetUserTrips(ctx context.Context, userID uuid.UUID) ([]*models.Membership, error) {
	return s.Membership.FindByUserID(ctx, userID)
}

func (s *MembershipService) UpdateMembership(ctx context.Context, userID, tripID uuid.UUID, req models.UpdateMembershipRequest) (*models.Membership, error) {
	// Load current membership to validate against
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
	profilePictureURL, err := s.getProfilePictureURL(ctx, membership.ProfilePictureKey)
	if err != nil {
		return nil, err
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

func (s *MembershipService) getProfilePictureURL(ctx context.Context, fileKey *string) (*string, error) {
	if fileKey == nil || *fileKey == "" || s.presignClient == nil {
		return nil, nil
	}

	presignedURL, err := s.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(*fileKey),
	}, s3.WithPresignExpires(s.urlExpiration))
	if err != nil {
		return nil, err
	}

	return &presignedURL.URL, nil
}
