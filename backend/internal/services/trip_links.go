package services

import (
	"context"
	"errors"
	"net/url"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/google/uuid"
)

type PitchLinkServiceInterface interface {
	AddLink(ctx context.Context, tripID, pitchID, userID uuid.UUID, req models.CreatePitchLinkRequest) (*models.PitchLink, error)
	GetLinks(ctx context.Context, pitchID uuid.UUID) ([]*models.PitchLink, error)
	DeleteLink(ctx context.Context, pitchID, linkID uuid.UUID) error
}

var _ PitchLinkServiceInterface = (*PitchLinkService)(nil)

type PitchLinkService struct {
	linkRepo   repository.PitchLinkRepository
	pitchRepo  repository.PitchRepository
	linkParser LinkParserServiceInterface
}

func NewPitchLinkService(linkRepo repository.PitchLinkRepository, pitchRepo repository.PitchRepository, linkParser LinkParserServiceInterface) PitchLinkServiceInterface {
	return &PitchLinkService{
		linkRepo:   linkRepo,
		pitchRepo:  pitchRepo,
		linkParser: linkParser,
	}
}

func (s *PitchLinkService) AddLink(ctx context.Context, tripID, pitchID, userID uuid.UUID, req models.CreatePitchLinkRequest) (*models.PitchLink, error) {
	pitch, err := s.pitchRepo.FindByIDAndTripID(ctx, pitchID, tripID)
	if err != nil {
		return nil, err
	}
	if pitch.UserID != userID {
		return nil, errs.Forbidden()
	}

	parsed, err := url.ParseRequestURI(req.URL)
	if err != nil {
		return nil, errs.BadRequest(errors.New("invalid URL"))
	}

	domain := parsed.Hostname()
	link := &models.PitchLink{
		ID:      uuid.New(),
		PitchID: pitchID,
		AddedBy: userID,
		URL:     req.URL,
		Domain:  &domain,
	}

	// best-effort OG metadata
	if s.linkParser != nil {
		if meta, err := s.linkParser.ParseLink(ctx, req.URL); err == nil {
			if meta.Name != "" {
				link.Title = &meta.Name
			}
			link.Description = meta.Description
			link.ThumbnailURL = meta.ThumbnailURL
		}
	}

	return s.linkRepo.Create(ctx, link)
}

func (s *PitchLinkService) GetLinks(ctx context.Context, pitchID uuid.UUID) ([]*models.PitchLink, error) {
	return s.linkRepo.FindByPitchID(ctx, pitchID)
}

func (s *PitchLinkService) DeleteLink(ctx context.Context, pitchID, linkID uuid.UUID) error {
	return s.linkRepo.Delete(ctx, linkID, pitchID)
}
