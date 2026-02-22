package services

import (
	"context"
	"errors"
	"fmt"
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

	// Look up the inviter's name
	inviter, err := s.User.Find(ctx, invite.CreatedBy)
	if err == nil {
		data.InviterName = inviter.Name
	}

	// Build deep link
	data.DeepLink = fmt.Sprintf("toggo://invite/%s", code)

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

	// Location and date range are not stored on the Trip model currently,
	// so we show placeholder text.
	data.LocationName = "Destination TBD"
	data.DateRange = "Dates TBD"

	return data, nil
}
