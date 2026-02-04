package services

import (
	"context"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/repository"
	"toggo/internal/utilities/pagination"

	"github.com/google/uuid"
)

type CommentServiceInterface interface {
	CreateComment(ctx context.Context, req models.CreateCommentRequest, userID uuid.UUID) (*models.Comment, error)
	UpdateComment(ctx context.Context, id uuid.UUID, userID uuid.UUID, req models.UpdateCommentRequest) (*models.Comment, error)
	DeleteComment(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	GetPaginatedComments(ctx context.Context, tripID uuid.UUID, entityType models.EntityType, entityID uuid.UUID, limit int, cursorToken string) (*models.PaginatedCommentsResponse, error)
}

var _ CommentServiceInterface = (*CommentService)(nil)

type CommentService struct {
	repository  *repository.Repository
	fileService FileServiceInterface
}

func NewCommentService(repo *repository.Repository, fileService FileServiceInterface) CommentServiceInterface {
	return &CommentService{
		repository:  repo,
		fileService: fileService,
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

	var nextCursor *string
	if len(comments) > requestLimit {
		comments = comments[:requestLimit]
		lastComment := comments[len(comments)-1]
		token, err := pagination.EncodeTimeUUIDCursorFromValues(lastComment.CreatedAt, lastComment.ID)
		if err != nil {
			return nil, err
		}
		nextCursor = &token
	}

	fileURLMap := pagination.FetchFileURLs(ctx, s.fileService, comments, func(item *models.CommentDatabaseResponse) *string {
		return item.ProfilePictureKey
	}, models.ImageSizeSmall)

	apiComments := make([]*models.CommentAPIResponse, 0, len(comments))
	for _, comment := range comments {
		var profilePictureURL *string
		if comment.ProfilePictureKey != nil && *comment.ProfilePictureKey != "" {
			if url, exists := fileURLMap[*comment.ProfilePictureKey]; exists {
				profilePictureURL = &url
			}
		}

		apiComments = append(apiComments, &models.CommentAPIResponse{
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
		})
	}

	return &models.PaginatedCommentsResponse{
		Items:      apiComments,
		NextCursor: nextCursor,
		Limit:      requestLimit,
	}, nil
}
