package services

import (
	"context"
	"sync"
	"time"
	"toggo/internal/config"
	"toggo/internal/interfaces"
	"toggo/internal/models"
	"toggo/internal/repository"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type CommentServiceInterface interface {
	CreateComment(ctx context.Context, req models.CreateCommentRequest) (*models.Comment, error)
	UpdateComment(ctx context.Context, id uuid.UUID, req models.UpdateCommentRequest) (*models.Comment, error)
	DeleteComment(ctx context.Context, id uuid.UUID) error
	GetPaginatedComments(ctx context.Context, tripID uuid.UUID, entityType models.EntityType, entityID uuid.UUID, limit *int, cursor *string) ([]*models.CommentAPIResponse, error)
}

var _ CommentServiceInterface = (*CommentService)(nil)

type CommentService struct {
	commentRepo   repository.CommentRepository
	presignClient interfaces.S3PresignClient
	bucketName    string
	urlExpiration time.Duration
}

type CommentServiceConfig struct {
	CommentRepo   repository.CommentRepository
	PresignClient interfaces.S3PresignClient
	BucketName    string
	URLExpiration time.Duration
}

func NewCommentService(repo *repository.Repository, cfg *config.Configuration) CommentServiceInterface {
	expiration := 15 * time.Minute

	return &CommentService{
		commentRepo:   repo.Comment,
		presignClient: cfg.AWS.PresignClient,
		bucketName:    cfg.AWS.BucketName,
		urlExpiration: expiration,
	}
}

func (s *CommentService) CreateComment(ctx context.Context, req models.CreateCommentRequest) (*models.Comment, error) {
	comment, err := s.commentRepo.Create(ctx, &models.Comment{
		TripID:     req.TripID,
		EntityType: req.EntityType,
		EntityID:   req.EntityID,
		UserID:     req.UserID,
		Content:    req.Content,
	})
	if err != nil {
		return nil, err
	}

	return comment, nil
}

func (s *CommentService) UpdateComment(ctx context.Context, id uuid.UUID, req models.UpdateCommentRequest) (*models.Comment, error) {
	comment, err := s.commentRepo.Update(ctx, id, req.Content)
	if err != nil {
		return nil, err
	}

	return comment, nil
}

func (s *CommentService) DeleteComment(ctx context.Context, id uuid.UUID) error {
	return s.commentRepo.Delete(ctx, id)
}

func (s *CommentService) GetPaginatedComments(ctx context.Context, tripID uuid.UUID, entityType models.EntityType, entityID uuid.UUID, limit *int, cursor *string) ([]*models.CommentAPIResponse, error) {
	comments, err := s.commentRepo.GetPaginatedComments(ctx, tripID, entityType, entityID, limit, cursor)
	if err != nil {
		return nil, err
	}

	apiComments := make([]*models.CommentAPIResponse, len(comments))
	var wg sync.WaitGroup
	errChan := make(chan error, len(comments))
	semaphore := make(chan struct{}, 10) // Limit to 10 concurrent goroutines

	for i, comment := range comments {
		wg.Add(1)
		go func(idx int, c *models.CommentDatabaseResponse) {
			defer wg.Done()

			semaphore <- struct{}{}        // Acquire
			defer func() { <-semaphore }() // Release

			apiComment, err := s.toAPIResponse(ctx, c)
			if err != nil {
				errChan <- err
				return
			}
			apiComments[idx] = apiComment
		}(i, comment)
	}

	wg.Wait()
	close(errChan)

	if len(errChan) > 0 {
		return nil, <-errChan
	}

	return apiComments, nil
}

func (s *CommentService) toAPIResponse(ctx context.Context, comment *models.CommentDatabaseResponse) (*models.CommentAPIResponse, error) {
	profilePictureURL, err := s.getProfilePictureURL(ctx, comment.ProfilePictureKey)
	if err != nil {
		return nil, err
	}

	return &models.CommentAPIResponse{
		ID:                comment.ID,
		TripID:            comment.TripID,
		EntityType:        comment.EntityType,
		EntityID:          comment.EntityID,
		UserID:            comment.UserID,
		Username:          comment.Username,
		ProfilePictureURL: profilePictureURL,
		Content:           comment.Content,
		CreatedAt:         comment.CreatedAt,
		UpdatedAt:         comment.UpdatedAt,
	}, nil
}

func (s *CommentService) getProfilePictureURL(ctx context.Context, fileKey *string) (*string, error) {
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
