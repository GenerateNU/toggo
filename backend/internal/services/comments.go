package services

import (
	"context"
	"log"
	"toggo/internal/errs"
	"toggo/internal/models"
	"toggo/internal/realtime"
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
	repository          *repository.Repository
	fileService         FileServiceInterface
	publisher           realtime.EventPublisher
	notificationService NotificationService
}

func NewCommentService(repo *repository.Repository, fileService FileServiceInterface, publisher realtime.EventPublisher, notificationService NotificationService) CommentServiceInterface {
	return &CommentService{
		repository:          repo,
		fileService:         fileService,
		publisher:           publisher,
		notificationService: notificationService,
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

	s.publishCommentCreated(ctx, comment, userID)
	go s.notifyNewComment(comment.TripID, userID)

	return comment, nil
}

func (s *CommentService) notifyNewComment(tripID uuid.UUID, actorID uuid.UUID) {
	if s.notificationService == nil {
		return
	}
	err := s.notificationService.NotifyTripMembers(
		context.Background(),
		tripID,
		actorID,
		models.NotificationPreferenceNewComment,
		"New comment",
		"Someone commented on your trip",
		nil,
	)
	if err != nil {
		log.Printf("Failed to send new comment notification: %v", err)
	}
}

func (s *CommentService) publishCommentCreated(ctx context.Context, comment *models.Comment, actorID uuid.UUID) {
	if s.publisher == nil {
		return
	}
	event, err := realtime.NewEventWithActor(
		realtime.EventTopicCommentCreated,
		comment.TripID.String(),
		comment.EntityID.String(),
		actorID.String(),
		"",
		comment,
	)
	if err != nil {
		log.Printf("Failed to create comment.created event: %v", err)
		return
	}
	if err := s.publisher.Publish(ctx, event); err != nil {
		log.Printf("Failed to publish comment.created event: %v", err)
	}
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
			Name:              comment.Name,
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
