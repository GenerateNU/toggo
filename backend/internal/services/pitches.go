package services

import (
	"context"
	"errors"
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
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/google/uuid"
	"golang.org/x/sync/errgroup"
)

// MaxPitchAudioSize is the maximum allowed size in bytes for pitch audio uploads (50 MiB).
const MaxPitchAudioSize = 50 * 1024 * 1024

// PitchServiceInterface defines business logic for trip pitches (create, get, list, update, delete).
type PitchServiceInterface interface {
	Create(ctx context.Context, tripID, userID uuid.UUID, req models.CreatePitchRequest) (*models.CreatePitchResponse, error)
	ConfirmUpload(ctx context.Context, tripID, pitchID, userID uuid.UUID) error
	GetByID(ctx context.Context, tripID, pitchID uuid.UUID) (*models.PitchAPIResponse, error)
	List(ctx context.Context, tripID uuid.UUID, limit int, cursorToken string) (*models.PitchCursorPageResult, error)
	Update(ctx context.Context, tripID, pitchID, userID uuid.UUID, req models.UpdatePitchRequest) (*models.PitchAPIResponse, error)
	Delete(ctx context.Context, tripID, pitchID uuid.UUID) error
}

var _ PitchServiceInterface = (*PitchService)(nil)

type PitchService struct {
	presignClient  interfaces.S3PresignClient
	s3Client       interfaces.S3Client
	pitchRepo      repository.PitchRepository
	membershipRepo repository.MembershipRepository
	imageRepo      repository.ImageRepository
	commentRepo    repository.CommentRepository
	pitchLinkRepo  repository.PitchLinkRepository
	bucketName     string
	urlExpiration  time.Duration
}

type PitchServiceConfig struct {
	PresignClient  interfaces.S3PresignClient
	S3Client       interfaces.S3Client
	PitchRepo      repository.PitchRepository
	MembershipRepo repository.MembershipRepository
	ImageRepo      repository.ImageRepository
	CommentRepo    repository.CommentRepository
	PitchLinkRepo  repository.PitchLinkRepository
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
		s3Client:       cfg.S3Client,
		pitchRepo:      cfg.PitchRepo,
		membershipRepo: cfg.MembershipRepo,
		imageRepo:      cfg.ImageRepo,
		commentRepo:    cfg.CommentRepo,
		pitchLinkRepo:  cfg.PitchLinkRepo,
		bucketName:     cfg.BucketName,
		urlExpiration:  expiration,
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
	imageKeys, err := s.pitchRepo.GetImagesForPitch(ctx, pitchID)
	if err != nil {
		return nil, fmt.Errorf("fetch pitch images: %w", err)
	}
	images, err := s.presignImageKeys(ctx, imageKeys)
	if err != nil {
		return nil, err
	}
	apiPitch := pitchToAPIResponse(created, "", images)

	return &models.CreatePitchResponse{
		Pitch:     apiPitch,
		UploadURL: presigned.URL,
		ExpiresAt: expiresAt,
	}, nil
}

// ConfirmUpload verifies that the audio file was successfully uploaded to S3.
// Must be called by the pitch creator after the presigned PUT upload completes.
func (s *PitchService) ConfirmUpload(ctx context.Context, tripID, pitchID, userID uuid.UUID) error {
	pitch, err := s.pitchRepo.FindByIDAndTripID(ctx, pitchID, tripID)
	if err != nil {
		return err
	}
	if pitch.UserID != userID {
		return errs.Forbidden()
	}
	_, err = s.s3Client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(pitch.AudioS3Key),
	})
	if err != nil {
		var notFound *s3types.NotFound
		if errors.As(err, &notFound) {
			return errs.BadRequest(errors.New("audio file not found in storage; upload may not have completed"))
		}
		return fmt.Errorf("check audio upload: %w", err)
	}
	return nil
}

// GetByID returns a pitch by id and trip id with presigned URLs for audio, images, links, and comment stats.
// Images, links, and comment stats are fetched concurrently.
func (s *PitchService) GetByID(ctx context.Context, tripID, pitchID uuid.UUID) (*models.PitchAPIResponse, error) {
	pitch, err := s.pitchRepo.FindByIDAndTripID(ctx, pitchID, tripID)
	if err != nil {
		return nil, err
	}
	audioURL, err := s.presignGetURL(ctx, pitch.AudioS3Key)
	if err != nil {
		return nil, fmt.Errorf("presign download URL: %w", err)
	}

	var imageKeys []models.PitchImageKey
	var links []*models.PitchLink
	var statsMap map[uuid.UUID]*models.PitchCommentStats

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		var err error
		imageKeys, err = s.pitchRepo.GetImagesForPitch(gctx, pitchID)
		return err
	})
	g.Go(func() error {
		var err error
		links, err = s.pitchLinkRepo.FindByPitchID(gctx, pitchID)
		return err
	})
	g.Go(func() error {
		var err error
		statsMap, err = s.commentRepo.GetCommentStatsForPitches(gctx, []uuid.UUID{pitchID})
		return err
	})
	if err := g.Wait(); err != nil {
		return nil, err
	}

	images, err := s.presignImageKeys(ctx, imageKeys)
	if err != nil {
		return nil, err
	}
	resp, err := s.enrichedPitchToAPIResponse(ctx, pitch, audioURL, images, links, statsMap[pitchID])
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// List returns pitches for a trip with cursor-based pagination. Images, links, and comment stats
// are batch-fetched concurrently to avoid N+1 queries.
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

	pitchIDs := make([]uuid.UUID, len(pitches))
	for i, p := range pitches {
		pitchIDs[i] = p.ID
	}

	var imageKeyMap map[uuid.UUID][]models.PitchImageKey
	var linkMap map[uuid.UUID][]*models.PitchLink
	var statsMap map[uuid.UUID]*models.PitchCommentStats

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		var err error
		imageKeyMap, err = s.pitchRepo.GetImagesForPitches(gctx, pitchIDs)
		return err
	})
	g.Go(func() error {
		var err error
		linkMap, err = s.pitchLinkRepo.FindByPitchIDs(gctx, pitchIDs)
		return err
	})
	g.Go(func() error {
		var err error
		statsMap, err = s.commentRepo.GetCommentStatsForPitches(gctx, pitchIDs)
		return err
	})
	if err := g.Wait(); err != nil {
		return nil, err
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
		resp, err := s.enrichedPitchToAPIResponse(ctx, p, audioURL, images, linkMap[p.ID], statsMap[p.ID])
		if err != nil {
			return nil, err
		}
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

	// After mutation, merge updated fields with enriched existing record (username, profile pic)
	// to avoid a second DB round-trip.
	finalPitch := existing
	if req.ImageIDs != nil {
		updated, err := s.pitchRepo.UpdateWithImages(ctx, pitchID, tripID, &req, *req.ImageIDs)
		if err != nil {
			return nil, err
		}
		finalPitch = mergeUpdatedPitch(updated, existing)
	} else if req.Title != nil || req.Description != nil || req.Duration != nil {
		updated, err := s.pitchRepo.Update(ctx, pitchID, tripID, &req)
		if err != nil {
			return nil, err
		}
		finalPitch = mergeUpdatedPitch(updated, existing)
	}

	audioURL, err := s.presignGetURL(ctx, finalPitch.AudioS3Key)
	if err != nil {
		return nil, fmt.Errorf("presign download URL: %w", err)
	}

	var imageKeys []models.PitchImageKey
	var links []*models.PitchLink
	var statsMap map[uuid.UUID]*models.PitchCommentStats

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		var err error
		imageKeys, err = s.pitchRepo.GetImagesForPitch(gctx, pitchID)
		return err
	})
	g.Go(func() error {
		var err error
		links, err = s.pitchLinkRepo.FindByPitchID(gctx, pitchID)
		return err
	})
	g.Go(func() error {
		var err error
		statsMap, err = s.commentRepo.GetCommentStatsForPitches(gctx, []uuid.UUID{pitchID})
		return err
	})
	if err := g.Wait(); err != nil {
		return nil, err
	}

	images, err := s.presignImageKeys(ctx, imageKeys)
	if err != nil {
		return nil, err
	}
	resp, err := s.enrichedPitchToAPIResponse(ctx, finalPitch, audioURL, images, links, statsMap[pitchID])
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// mergeUpdatedPitch combines mutable fields from a TripPitch (post-update) with
// the user-enriched fields from the pre-fetched PitchDatabaseResponse, avoiding
// an extra DB round-trip after an update.
func mergeUpdatedPitch(updated *models.TripPitch, src *models.PitchDatabaseResponse) *models.PitchDatabaseResponse {
	return &models.PitchDatabaseResponse{
		ID:                updated.ID,
		TripID:            updated.TripID,
		UserID:            updated.UserID,
		Title:             updated.Title,
		Description:       updated.Description,
		AudioS3Key:        updated.AudioS3Key,
		Duration:          updated.Duration,
		CreatedAt:         updated.CreatedAt,
		UpdatedAt:         updated.UpdatedAt,
		Username:          src.Username,
		ProfilePictureKey: src.ProfilePictureKey,
	}
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
	confirmedIDs, err := s.imageRepo.FindConfirmedByIDs(ctx, imageIDs)
	if err != nil {
		return err
	}
	if len(confirmedIDs) != len(imageIDs) {
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

func (s *PitchService) enrichedPitchToAPIResponse(ctx context.Context, p *models.PitchDatabaseResponse, audioURL string, images []models.PitchImageInfo, links []*models.PitchLink, stats *models.PitchCommentStats) (models.PitchAPIResponse, error) {
	var profilePictureURL *string
	if p.ProfilePictureKey != nil {
		url, err := s.presignGetURL(ctx, *p.ProfilePictureKey)
		if err == nil {
			profilePictureURL = &url
		}
	}

	commentCount := 0
	commentPreviews := []models.CommenterPreview{}
	if stats != nil {
		commentCount = stats.Count
		commentPreviews = make([]models.CommenterPreview, 0, len(stats.Previews))
		for _, c := range stats.Previews {
			preview := models.CommenterPreview{
				UserID:   c.UserID,
				Username: c.Username,
			}
			if c.ProfilePictureKey != nil {
				url, err := s.presignGetURL(ctx, *c.ProfilePictureKey)
				if err == nil {
					preview.ProfilePictureURL = &url
				}
			}
			commentPreviews = append(commentPreviews, preview)
		}
	}

	return models.PitchAPIResponse{
		ID:                p.ID,
		TripID:            p.TripID,
		UserID:            p.UserID,
		Username:          p.Username,
		ProfilePictureURL: profilePictureURL,
		Title:             p.Title,
		Description:       p.Description,
		AudioURL:          audioURL,
		Duration:          p.Duration,
		Images:            images,
		Links:             links,
		CommentCount:      commentCount,
		CommentPreviews:   commentPreviews,
		CreatedAt:         p.CreatedAt,
		UpdatedAt:         p.UpdatedAt,
	}, nil
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
