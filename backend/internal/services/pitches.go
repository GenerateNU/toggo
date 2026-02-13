package services

import (
	"context"
	"fmt"
	"strings"
	"time"
	"toggo/internal/errs"
	"toggo/internal/interfaces"
	"toggo/internal/models"
	"toggo/internal/repository"
	"toggo/internal/utilities/pagination"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

// PitchServiceInterface defines business logic for trip pitches (create, get, list, update, delete).
type PitchServiceInterface interface {
	Create(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePitchRequest) (*models.CreatePitchResponse, error)
	GetByID(ctx context.Context, tripID, pitchID uuid.UUID) (*models.PitchAPIResponse, error)
	List(ctx context.Context, tripID uuid.UUID, limit int, cursorToken string) (*models.PitchCursorPageResult, error)
	Update(ctx context.Context, tripID, pitchID uuid.UUID, req models.UpdatePitchRequest) (*models.PitchAPIResponse, error)
	Delete(ctx context.Context, tripID, pitchID uuid.UUID) error
}

var _ PitchServiceInterface = (*PitchService)(nil)

type PitchService struct {
	presignClient interfaces.S3PresignClient
	pitchRepo     repository.PitchRepository
	membershipRepo repository.MembershipRepository
	bucketName    string
	urlExpiration time.Duration
}

type PitchServiceConfig struct {
	PresignClient  interfaces.S3PresignClient
	PitchRepo      repository.PitchRepository
	MembershipRepo repository.MembershipRepository
	BucketName     string
	URLExpiration  time.Duration
}

func NewPitchService(cfg PitchServiceConfig) PitchServiceInterface {
	expiration := cfg.URLExpiration
	if expiration == 0 {
		expiration = 15 * time.Minute
	}
	return &PitchService{
		presignClient:  cfg.PresignClient,
		pitchRepo:      cfg.PitchRepo,
		membershipRepo: cfg.MembershipRepo,
		bucketName:     cfg.BucketName,
		urlExpiration:  expiration,
	}
}

// Create creates a pitch record and returns metadata plus a presigned PUT URL for uploading the audio file.
func (s *PitchService) Create(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePitchRequest) (*models.CreatePitchResponse, error) {
	isMember, err := s.membershipRepo.IsMember(ctx, tripID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errs.Forbidden()
	}

	pitchID := uuid.New()
	ext := extensionFromContentType(req.ContentType)
	// Single bucket, folder layout per ticket: trips/:tripId/pitches (e.g. profile_pictures/ elsewhere)
	audioKey := fmt.Sprintf("trips/%s/pitches/%s.%s", tripID.String(), pitchID.String(), ext)

	pitch := &models.TripPitch{
		ID:          pitchID,
		TripID:      tripID,
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		AudioS3Key:  audioKey,
	}
	created, err := s.pitchRepo.Create(ctx, pitch)
	if err != nil {
		return nil, fmt.Errorf("create pitch: %w", err)
	}

	presigned, err := s.presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(audioKey),
		ContentType: aws.String(req.ContentType),
	}, s3.WithPresignExpires(s.urlExpiration))
	if err != nil {
		return nil, fmt.Errorf("presign upload URL: %w", err)
	}

	expiresAt := time.Now().Add(s.urlExpiration).UTC().Format(time.RFC3339)
	apiPitch := pitchToAPIResponse(created, "") // no download URL until audio is uploaded
	return &models.CreatePitchResponse{
		Pitch:     apiPitch,
		UploadURL: presigned.URL,
		ExpiresAt: expiresAt,
	}, nil
}

// GetByID returns a pitch by id and trip id with a presigned GET URL for the audio file.
func (s *PitchService) GetByID(ctx context.Context, tripID, pitchID uuid.UUID) (*models.PitchAPIResponse, error) {
	pitch, err := s.pitchRepo.FindByIDAndTripID(ctx, pitchID, tripID)
	if err != nil {
		return nil, err
	}
	audioURL, err := s.presignGetURL(ctx, pitch.AudioS3Key)
	if err != nil {
		return nil, fmt.Errorf("presign download URL: %w", err)
	}
	resp := pitchToAPIResponse(pitch, audioURL)
	return &resp, nil
}

// List returns pitches for a trip with cursor-based pagination; each item includes a presigned audio URL.
func (s *PitchService) List(ctx context.Context, tripID uuid.UUID, limit int, cursorToken string) (*models.PitchCursorPageResult, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	var cursor *models.PitchCursor
	if cursorToken != "" {
		decoded, err := pagination.DecodeTimeUUIDCursor(cursorToken)
		if err != nil {
			return nil, err
		}
		cursor = decoded
	}

	pitches, nextCursor, err := s.pitchRepo.FindByTripIDWithCursor(ctx, tripID, limit, cursor)
	if err != nil {
		return nil, err
	}

	items := make([]*models.PitchAPIResponse, 0, len(pitches))
	for _, p := range pitches {
		audioURL, err := s.presignGetURL(ctx, p.AudioS3Key)
		if err != nil {
			return nil, fmt.Errorf("presign download URL for pitch %s: %w", p.ID, err)
		}
		resp := pitchToAPIResponse(p, audioURL)
		items = append(items, &resp)
	}

	var nextCursorStr *string
	if nextCursor != nil {
		token, err := pagination.EncodeTimeUUIDCursorFromValues(nextCursor.CreatedAt, nextCursor.ID)
		if err != nil {
			return nil, err
		}
		nextCursorStr = &token
	}

	return &models.PitchCursorPageResult{
		Items:      items,
		NextCursor: nextCursorStr,
		Limit:      limit,
	}, nil
}

// Update updates pitch metadata (title, description, duration) and returns the updated pitch with presigned audio URL.
func (s *PitchService) Update(ctx context.Context, tripID, pitchID uuid.UUID, req models.UpdatePitchRequest) (*models.PitchAPIResponse, error) {
	updated, err := s.pitchRepo.Update(ctx, pitchID, tripID, &req)
	if err != nil {
		return nil, err
	}
	audioURL, err := s.presignGetURL(ctx, updated.AudioS3Key)
	if err != nil {
		return nil, fmt.Errorf("presign download URL: %w", err)
	}
	resp := pitchToAPIResponse(updated, audioURL)
	return &resp, nil
}

// Delete removes a pitch by id and trip id.
func (s *PitchService) Delete(ctx context.Context, tripID, pitchID uuid.UUID) error {
	return s.pitchRepo.Delete(ctx, pitchID, tripID)
}

func (s *PitchService) presignGetURL(ctx context.Context, key string) (string, error) {
	presigned, err := s.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(s.urlExpiration))
	if err != nil {
		return "", err
	}
	return presigned.URL, nil
}

func pitchToAPIResponse(p *models.TripPitch, audioURL string) models.PitchAPIResponse {
	return models.PitchAPIResponse{
		ID:          p.ID,
		TripID:      p.TripID,
		UserID:      p.UserID,
		Title:       p.Title,
		Description: p.Description,
		AudioURL:    audioURL,
		Duration:    p.Duration,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}

// extensionFromContentType returns a file extension for common audio MIME types.
func extensionFromContentType(contentType string) string {
	contentType = strings.TrimSpace(strings.ToLower(contentType))
	switch {
	case strings.HasSuffix(contentType, "m4a"), contentType == "audio/mp4":
		return "m4a"
	case strings.HasSuffix(contentType, "mpeg"), strings.HasSuffix(contentType, "mp3"):
		return "mp3"
	case strings.HasSuffix(contentType, "wav"):
		return "wav"
	case strings.HasSuffix(contentType, "ogg"):
		return "ogg"
	case strings.HasSuffix(contentType, "webm"):
		return "webm"
	default:
		return "m4a"
	}
}
