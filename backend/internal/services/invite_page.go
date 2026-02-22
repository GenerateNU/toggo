package services

import (
	"context"
	"errors"
	"fmt"
	"html/template"
	"os"
	"strings"
	"time"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"
)

type InvitePageServiceInterface interface {
	GetTripInvitePageData(ctx context.Context, code string) (*models.TripInvitePageData, error)
}

var _ InvitePageServiceInterface = (*InvitePageService)(nil)

type InvitePageService struct {
	*repository.Repository
	fileService FileServiceInterface
}

func NewInvitePageService(repo *repository.Repository, fileService FileServiceInterface) InvitePageServiceInterface {
	return &InvitePageService{
		Repository:  repo,
		fileService: fileService,
	}
}

func (s *InvitePageService) GetTripInvitePageData(ctx context.Context, code string) (*models.TripInvitePageData, error) {
	data := &models.TripInvitePageData{
		InviteCode: code,
	}

	// Look up invite by code
	invite, err := s.TripInvite.FindByCode(ctx, code)
	if err != nil {
		if errors.Is(err, errs.ErrNotFound) {
			data.ErrorMessage = "This invite code is invalid."
			return data, nil
		}
		return nil, err
	}

	// Check if invite is expired or revoked
	now := time.Now().UTC()
	if invite.IsRevoked {
		data.ErrorMessage = "This invite link has been revoked."
		return data, nil
	}
	if invite.ExpiresAt.Before(now) {
		data.ErrorMessage = "This invite link has expired."
		return data, nil
	}

	// Fetch trip details
	tripData, err := s.Trip.FindWithCoverImage(ctx, invite.TripID)
	if err != nil {
		if errors.Is(err, errs.ErrNotFound) {
			data.ErrorMessage = "The trip associated with this invite no longer exists."
			return data, nil
		}
		return nil, err
	}

	data.TripName = tripData.Name

	// Look up the inviter's name and profile picture
	inviter, err := s.User.Find(ctx, invite.CreatedBy)
	if err == nil {
		data.InviterName = inviter.Name
		if inviter.ProfilePicture != nil {
			fileResp, err := s.fileService.GetFile(ctx, *inviter.ProfilePicture, models.ImageSizeSmall)
			if err == nil {
				data.InviterProfilePictureURL = &fileResp.URL
			}
		}
	}

	// Build deep link
	// Expo Go local dev: exp://localhost:8081/--/invite/CODE
	// Production:        toggo://invite/CODE
	deepLinkBase := os.Getenv("DEEPLINK_BASE_URL")
	if deepLinkBase == "" {
		deepLinkBase = "exp://localhost:8081/--"
	}
	data.DeepLink = template.URL(fmt.Sprintf("%s/invite/%s", strings.TrimRight(deepLinkBase, "/"), code))

	// Build canonical URL
	baseURL := os.Getenv("APP_PUBLIC_URL")
	if baseURL != "" {
		trimmed := strings.TrimRight(baseURL, "/")
		data.CanonicalURL = trimmed + "/join?code=" + code
	}

	// Fetch cover image presigned URL
	if tripData.CoverImageID != nil {
		fileResp, err := s.fileService.GetFile(ctx, *tripData.CoverImageID, models.ImageSizeMedium)
		if err == nil {
			data.CoverImageURL = &fileResp.URL
		}
	}

	// Fetch members for this trip
	members, err := s.Membership.FindByTripID(ctx, invite.TripID)
	if err != nil {
		return nil, err
	}

	data.MemberCount = len(members)
	if len(members) > 0 {
		data.FirstMemberName = members[0].Username
		data.OtherMemberCount = len(members) - 1
	}

	return data, nil
}
