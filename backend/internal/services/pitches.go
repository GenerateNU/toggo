package services

import (
	"context"
	"errors"
	"fmt"
	"log"
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

// MaxPitchAudioSize is the maximum allowed size in bytes for pitch audio uploads (50 MiB).
const MaxPitchAudioSize = 50 * 1024 * 1024

// PitchServiceInterface defines business logic for trip pitches (create, get, list, update, delete).
type PitchServiceInterface interface {
	Create(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePitchRequest) (*models.CreatePitchResponse, error)
	GetByID(ctx context.Context, tripID, pitchID uuid.UUID) (*models.PitchAPIResponse, error)
	List(ctx context.Context, tripID uuid.UUID, limit int, cursorToken string) (*models.PitchCursorPageResult, error)
	Update(ctx context.Context, tripID, pitchID, userID uuid.UUID, req models.UpdatePitchRequest) (*models.PitchAPIResponse, error)
	Delete(ctx context.Context, tripID, pitchID uuid.UUID) error
}

var _ PitchServiceInterface = (*PitchService)(nil)

type PitchService struct {
	presignClient       interfaces.S3PresignClient
	pitchRepo           repository.PitchRepository
	membershipRepo      repository.MembershipRepository
	imageRepo           repository.ImageRepository
	bucketName          string
	urlExpiration       time.Duration
	notificationService NotificationService
}

type PitchServiceConfig struct {
	PresignClient       interfaces.S3PresignClient
	PitchRepo           repository.PitchRepository
	MembershipRepo      repository.MembershipRepository
	ImageRepo           repository.ImageRepository
	BucketName          string
	URLExpiration       time.Duration
	NotificationService NotificationService
}

func NewPitchService(cfg PitchServiceConfig) PitchServiceInterface {
	expiration := cfg.URLExpiration
	if expiration == 0 {
		expiration = 15 * time.Minute
	}
	return &PitchService{
		presignClient:       cfg.PresignClient,
		pitchRepo:           cfg.PitchRepo,
		membershipRepo:      cfg.MembershipRepo,
		imageRepo:           cfg.ImageRepo,
		bucketName:          cfg.BucketName,
		urlExpiration:       expiration,
		notificationService: cfg.NotificationService,
	}
}

// Create creates a pitch record (with image associations in one transaction) and returns
// metadata plus a presigned PUT URL for uploading the audio file.
func (s *PitchService) Create(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePitchRequest) (*models.CreatePitchResponse, error) {
	isMember, err := s.membershipRepo.IsMember(ctx, tripID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errs.Forbidden()
	}

	if err := s.validateImageIDs(ctx, req.ImageIDs); err != nil {
		return nil, err
	}

	pitchID := uuid.New()
	ext, err := extensionFromContentType(req.ContentType)
	if err != nil {
		return nil, errs.BadRequest(err)
	}
	// Single bucket, folder layout per ticket: trips/:tripId/pitches (e.g. profile_pictures/ elsewhere)
	audioKey := fmt.Sprintf("trips/%s/pitches/%s.%s", tripID.String(), pitchID.String(), ext)

	if req.ContentLength <= 0 {
		return nil, errs.BadRequest(errors.New("content_length must be positive"))
	}
	if req.ContentLength > MaxPitchAudioSize {
		return nil, errs.BadRequest(fmt.Errorf("content_length exceeds maximum allowed size (%d bytes)", MaxPitchAudioSize))
	}

	pitch := &models.TripPitch{
		ID:          pitchID,
		TripID:      tripID,
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		AudioS3Key:  audioKey,
	}
	created, err := s.pitchRepo.CreateWithImages(ctx, pitch, req.ImageIDs)
	if err != nil {
		return nil, fmt.Errorf("create pitch: %w", err)
	}

	presigned, err := s.presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(s.bucketName),
		Key:           aws.String(audioKey),
		ContentType:   aws.String(req.ContentType),
		ContentLength: aws.Int64(req.ContentLength),
	}, s3.WithPresignExpires(s.urlExpiration))
	if err != nil {
		return nil, fmt.Errorf("presign upload URL: %w", err)
	}

	expiresAt := time.Now().Add(s.urlExpiration).UTC().Format(time.RFC3339)
	// Fetch images with medium keys and presign URLs for the response (no audio download URL until audio is uploaded)
	imageKeys, err := s.pitchRepo.GetImagesForPitch(ctx, pitchID)
	if err != nil {
		return nil, fmt.Errorf("fetch pitch images: %w", err)
	}
	images, err := s.presignImageKeys(ctx, imageKeys)
	if err != nil {
		return nil, err
	}
	apiPitch := pitchToAPIResponse(created, "", images)

	go s.notifyNewPitch(tripID, userID)

	return &models.CreatePitchResponse{
		Pitch:     apiPitch,
		UploadURL: presigned.URL,
		ExpiresAt: expiresAt,
	}, nil
}

func (s *PitchService) notifyNewPitch(tripID uuid.UUID, actorID uuid.UUID) {
	if s.notificationService == nil {
		return
	}
	err := s.notificationService.NotifyTripMembers(
		context.Background(),
		tripID,
		actorID,
		models.NotificationPreferenceNewPitch,
		"New pitch",
		"A new pitch has been added to your trip",
		nil,
	)
	if err != nil {
		log.Printf("Failed to send new pitch notification: %v", err)
	}
}

// GetByID returns a pitch by id and trip id with presigned URLs for audio and images.
func (s *PitchService) GetByID(ctx context.Context, tripID, pitchID uuid.UUID) (*models.PitchAPIResponse, error) {
	pitch, err := s.pitchRepo.FindByIDAndTripID(ctx, pitchID, tripID)
	if err != nil {
		return nil, err
	}
	audioURL, err := s.presignGetURL(ctx, pitch.AudioS3Key)
	if err != nil {
		return nil, fmt.Errorf("presign download URL: %w", err)
	}
	imageKeys, err := s.pitchRepo.GetImagesForPitch(ctx, pitchID)
	if err != nil {
		return nil, fmt.Errorf("fetch pitch images: %w", err)
	}
	images, err := s.presignImageKeys(ctx, imageKeys)
	if err != nil {
		return nil, err
	}
	resp := pitchToAPIResponse(pitch, audioURL, images)
	return &resp, nil
}

// List returns pitches for a trip with cursor-based pagination; each item includes a presigned audio URL
// and associated image keys (batch-loaded to avoid N+1).
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

	// Batch-load all images in a single query to avoid N+1.
	pitchIDs := make([]uuid.UUID, len(pitches))
	for i, p := range pitches {
		pitchIDs[i] = p.ID
	}
	imageKeyMap, err := s.pitchRepo.GetImagesForPitches(ctx, pitchIDs)
	if err != nil {
		return nil, fmt.Errorf("batch fetch pitch images: %w", err)
	}

	items := make([]*models.PitchAPIResponse, 0, len(pitches))
	for _, p := range pitches {
		audioURL, err := s.presignGetURL(ctx, p.AudioS3Key)
		if err != nil {
			return nil, fmt.Errorf("presign download URL for pitch %s: %w", p.ID, err)
		}
		images, err := s.presignImageKeys(ctx, imageKeyMap[p.ID])
		if err != nil {
			return nil, err
		}
		resp := pitchToAPIResponse(p, audioURL, images)
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

// Update updates pitch metadata and, when ImageIDs is provided in the request, replaces image associations.
// Only the pitch creator (userID == pitch.UserID) is allowed to update; members who did not create the pitch get a 403.
func (s *PitchService) Update(ctx context.Context, tripID, pitchID, userID uuid.UUID, req models.UpdatePitchRequest) (*models.PitchAPIResponse, error) {
	existing, err := s.pitchRepo.FindByIDAndTripID(ctx, pitchID, tripID)
	if err != nil {
		return nil, err
	}
	if existing.UserID != userID {
		return nil, errs.Forbidden()
	}

	if req.ImageIDs != nil {
		if err := s.validateImageIDs(ctx, *req.ImageIDs); err != nil {
			return nil, err
		}
		// UpdateWithImages is additive (ON CONFLICT DO NOTHING), not a replacement.
		// Enforce the cap against the post-merge total so we cannot silently
		// accumulate more than MaxPitchImages even across separate calls.
		if len(*req.ImageIDs) > 0 {
			existingIDs, err := s.pitchRepo.GetImageIDsForPitch(ctx, pitchID)
			if err != nil {
				return nil, fmt.Errorf("fetch existing pitch image IDs: %w", err)
			}
			existingSet := make(map[uuid.UUID]struct{}, len(existingIDs))
			for _, id := range existingIDs {
				existingSet[id] = struct{}{}
			}
			mergedCount := len(existingIDs)
			for _, id := range *req.ImageIDs {
				if _, alreadyExists := existingSet[id]; !alreadyExists {
					mergedCount++
				}
			}
			if mergedCount > models.MaxPitchImages {
				return nil, errs.BadRequest(fmt.Errorf(
					"adding these images would exceed the limit of %d images per pitch",
					models.MaxPitchImages,
				))
			}
		}
	}

	// When image_ids are provided, use UpdateWithImages so metadata update and
	// image association merge happen atomically in a single transaction.
	var updated *models.TripPitch
	if req.ImageIDs != nil {
		var err error
		updated, err = s.pitchRepo.UpdateWithImages(ctx, pitchID, tripID, &req, *req.ImageIDs)
		if err != nil {
			return nil, err
		}
	} else if req.Title != nil || req.Description != nil || req.Duration != nil {
		var err error
		updated, err = s.pitchRepo.Update(ctx, pitchID, tripID, &req)
		if err != nil {
			return nil, err
		}
	} else {
		updated = existing
	}

	audioURL, err := s.presignGetURL(ctx, updated.AudioS3Key)
	if err != nil {
		return nil, fmt.Errorf("presign download URL: %w", err)
	}

	// Always read back the current images so the response is consistent.
	imageKeys, err := s.pitchRepo.GetImagesForPitch(ctx, pitchID)
	if err != nil {
		return nil, fmt.Errorf("fetch pitch images: %w", err)
	}
	images, err := s.presignImageKeys(ctx, imageKeys)
	if err != nil {
		return nil, err
	}

	resp := pitchToAPIResponse(updated, audioURL, images)
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

// validateImageIDs checks the image count limit, rejects duplicate IDs, and
// verifies that every image exists as a confirmed upload (batch operation).
func (s *PitchService) validateImageIDs(ctx context.Context, imageIDs []uuid.UUID) error {
	if len(imageIDs) > models.MaxPitchImages {
		return errs.BadRequest(fmt.Errorf("a pitch can have at most %d images", models.MaxPitchImages))
	}
	seen := make(map[uuid.UUID]struct{}, len(imageIDs))
	for _, id := range imageIDs {
		if _, ok := seen[id]; ok {
			return errs.BadRequest(fmt.Errorf("duplicate image ID: %s", id))
		}
		seen[id] = struct{}{}
	}
	// Batch check: verify all images exist and are confirmed in a single query
	confirmedIDs, err := s.imageRepo.FindConfirmedByIDs(ctx, imageIDs)
	if err != nil {
		return err
	}
	if len(confirmedIDs) != len(imageIDs) {
		// Find which IDs are missing
		confirmedSet := make(map[uuid.UUID]struct{}, len(confirmedIDs))
		for _, id := range confirmedIDs {
			confirmedSet[id] = struct{}{}
		}
		for _, id := range imageIDs {
			if _, exists := confirmedSet[id]; !exists {
				return errs.BadRequest(fmt.Errorf("image %s not found or not yet confirmed", id))
			}
		}
	}
	return nil
}

func pitchToAPIResponse(p *models.TripPitch, audioURL string, images []models.PitchImageInfo) models.PitchAPIResponse {
	return models.PitchAPIResponse{
		ID:          p.ID,
		TripID:      p.TripID,
		UserID:      p.UserID,
		Title:       p.Title,
		Description: p.Description,
		AudioURL:    audioURL,
		Duration:    p.Duration,
		Images:      images,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}

// presignImageKeys converts image keys to presigned URLs
func (s *PitchService) presignImageKeys(ctx context.Context, imageKeys []models.PitchImageKey) ([]models.PitchImageInfo, error) {
	if len(imageKeys) == 0 {
		return []models.PitchImageInfo{}, nil
	}
	result := make([]models.PitchImageInfo, len(imageKeys))
	for i, img := range imageKeys {
		mediumURL, err := s.presignGetURL(ctx, img.MediumKey)
		if err != nil {
			return nil, fmt.Errorf("presign medium URL for image %s: %w", img.ID, err)
		}
		result[i] = models.PitchImageInfo{
			ID:        img.ID,
			MediumURL: mediumURL,
		}
	}
	return result, nil
}

// extensionFromContentType returns a file extension for allowed audio MIME types.
// Unsupported types return a non-nil error including the contentType for diagnosis.
func extensionFromContentType(contentType string) (string, error) {
	contentType = strings.TrimSpace(strings.ToLower(contentType))
	switch {
	case strings.HasSuffix(contentType, "m4a"), contentType == "audio/mp4":
		return "m4a", nil
	case strings.HasSuffix(contentType, "mpeg"), strings.HasSuffix(contentType, "mp3"):
		return "mp3", nil
	case strings.HasSuffix(contentType, "wav"):
		return "wav", nil
	case strings.HasSuffix(contentType, "ogg"):
		return "ogg", nil
	case strings.HasSuffix(contentType, "webm"):
		return "webm", nil
	default:
		return "", fmt.Errorf("unsupported content type: %s", contentType)
	}
}
