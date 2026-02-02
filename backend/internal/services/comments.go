package services

import (
	"context"
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

type CommentServiceInterface interface {
	CreateComment(ctx context.Context, req models.CreateCommentRequest, userID uuid.UUID) (*models.Comment, error)
	UpdateComment(ctx context.Context, id uuid.UUID, userID uuid.UUID, req models.UpdateCommentRequest) (*models.Comment, error)
	DeleteComment(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	GetPaginatedComments(ctx context.Context, tripID uuid.UUID, entityType models.EntityType, entityID uuid.UUID, limit int, cursorToken string) (*models.PaginatedCommentsResponse, error)
}

var _ CommentServiceInterface = (*CommentService)(nil)

type CommentService struct {
	repository    *repository.Repository
	presignClient interfaces.S3PresignClient
	bucketName    string
	urlExpiration time.Duration
}

func NewCommentService(repo *repository.Repository, cfg *config.Configuration) CommentServiceInterface {
	expiration := 15 * time.Minute

	return &CommentService{
		repository:    repo,
		presignClient: cfg.AWS.PresignClient,
		bucketName:    cfg.AWS.BucketName,
		urlExpiration: expiration,
	}
}

func (s *CommentService) CreateComment(ctx context.Context, req models.CreateCommentRequest, userID uuid.UUID) (*models.Comment, error) {
	isMember, err := s.repository.Membership.IsMember(ctx, req.TripID, userID)
	if err != nil {
		return nil, err
	}

	if !isMember {
		return nil, errs.Forbidden()
	}

	comment, err := s.repository.Comment.Create(ctx, &models.Comment{
		TripID:     req.TripID,
		EntityType: req.EntityType,
		EntityID:   req.EntityID,
		UserID:     userID,
		Content:    req.Content,
	})
	if err != nil {
		return nil, err
	}

	return comment, nil
}

func (s *CommentService) UpdateComment(ctx context.Context, id uuid.UUID, userID uuid.UUID, req models.UpdateCommentRequest) (*models.Comment, error) {
	return s.repository.Comment.Update(ctx, id, userID, req.Content)
}

func (s *CommentService) DeleteComment(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	return s.repository.Comment.Delete(ctx, id, userID)
}

func (s *CommentService) GetPaginatedComments(
	ctx context.Context,
	tripID uuid.UUID,
	entityType models.EntityType,
	entityID uuid.UUID,
	limit int,
	cursorToken string,
) (*models.PaginatedCommentsResponse, error) {
	requestLimit := limit
	if requestLimit <= 0 {
		requestLimit = 20
	}

	var commentCursor *models.CommentCursor
	if cursorToken != "" {
		decoded, err := pagination.DecodeTimeUUIDCursor(cursorToken)
		if err != nil {
			return nil, err
		}
		commentCursor = decoded
	}

	comments, err := s.repository.Comment.FindPaginatedComments(
		ctx, tripID, entityType, entityID, requestLimit, commentCursor,
	)
	if err != nil {
		return nil, err
	}

	// Determine if there are more results
	var nextCursor *string
	if len(comments) > requestLimit {
		// Remove the extra record and set next cursor
		comments = comments[:requestLimit]
		lastComment := comments[len(comments)-1]
		token, err := pagination.EncodeTimeUUIDCursorFromValues(lastComment.CreatedAt, lastComment.ID)
		if err != nil {
			return nil, err
		}
		nextCursor = &token
	}

	apiComments := make([]*models.CommentAPIResponse, len(comments))

	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(10)

	for i, comment := range comments {
		g.Go(func() error {
			apiComment, err := s.toAPIResponse(ctx, comment)
			if err != nil {
				return err
			}
			apiComments[i] = apiComment
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return &models.PaginatedCommentsResponse{
		Items:      apiComments,
		NextCursor: nextCursor,
		Limit:      requestLimit,
	}, nil
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
