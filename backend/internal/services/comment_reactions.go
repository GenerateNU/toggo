package services

import (
	"context"

	"toggo/internal/models"
	"toggo/internal/repository"
	"toggo/internal/utilities/pagination"

	"github.com/google/uuid"
)

type CommentReactionServiceInterface interface {
	AddReaction(ctx context.Context, commentID uuid.UUID, userID uuid.UUID, req models.CreateCommentReactionRequest) (*models.CommentReaction, error)
	RemoveReaction(ctx context.Context, commentID uuid.UUID, userID uuid.UUID, req models.DeleteCommentReactionRequest) error
	GetReactionSummary(ctx context.Context, commentID uuid.UUID, userID uuid.UUID) (*models.CommentReactionsSummaryResponse, error)
	GetReactionUsers(ctx context.Context, commentID uuid.UUID, userID uuid.UUID, emoji string) (*models.CommentReactionUsersResponse, error)
}

var _ CommentReactionServiceInterface = (*CommentReactionService)(nil)

type CommentReactionService struct {
	repository  *repository.Repository
	fileService FileServiceInterface
}

func NewCommentReactionService(repo *repository.Repository, fileService FileServiceInterface) CommentReactionServiceInterface {
	return &CommentReactionService{
		repository:  repo,
		fileService: fileService,
	}
}

func (s *CommentReactionService) ensureCommentVisibleToUser(ctx context.Context, commentID uuid.UUID, userID uuid.UUID) error {
	return s.repository.CommentReaction.EnsureCommentVisibleToUser(ctx, commentID, userID)
}

func (s *CommentReactionService) AddReaction(ctx context.Context, commentID uuid.UUID, userID uuid.UUID, req models.CreateCommentReactionRequest) (*models.CommentReaction, error) {
	if err := s.ensureCommentVisibleToUser(ctx, commentID, userID); err != nil {
		return nil, err
	}

	return s.repository.CommentReaction.Create(ctx, &models.CommentReaction{
		CommentID: commentID,
		UserID:    userID,
		Emoji:     req.Emoji,
	})
}

func (s *CommentReactionService) RemoveReaction(ctx context.Context, commentID uuid.UUID, userID uuid.UUID, req models.DeleteCommentReactionRequest) error {
	if err := s.ensureCommentVisibleToUser(ctx, commentID, userID); err != nil {
		return err
	}

	// Idempotent: deleting a non-existent reaction should not error.
	return s.repository.CommentReaction.DeleteByUserEmoji(ctx, commentID, userID, req.Emoji)
}

func (s *CommentReactionService) GetReactionSummary(ctx context.Context, commentID uuid.UUID, userID uuid.UUID) (*models.CommentReactionsSummaryResponse, error) {
	if err := s.ensureCommentVisibleToUser(ctx, commentID, userID); err != nil {
		return nil, err
	}

	summary, err := s.repository.CommentReaction.GetSummary(ctx, commentID, userID)
	if err != nil {
		return nil, err
	}

	return &models.CommentReactionsSummaryResponse{
		CommentID: commentID,
		Reactions: summary,
	}, nil
}

func (s *CommentReactionService) GetReactionUsers(ctx context.Context, commentID uuid.UUID, userID uuid.UUID, emoji string) (*models.CommentReactionUsersResponse, error) {
	if err := s.ensureCommentVisibleToUser(ctx, commentID, userID); err != nil {
		return nil, err
	}

	rows, err := s.repository.CommentReaction.ListUsersForEmoji(ctx, commentID, emoji)
	if err != nil {
		return nil, err
	}

	fileURLMap := pagination.FetchFileURLs(ctx, s.fileService, rows, func(item repository.CommentReactionUserDBRow) *string {
		return item.ProfilePictureKey
	}, models.ImageSizeSmall)

	users := make([]models.CommentReactionUser, 0, len(rows))
	for _, row := range rows {
		var profilePictureURL *string
		if row.ProfilePictureKey != nil && *row.ProfilePictureKey != "" {
			if url, exists := fileURLMap[*row.ProfilePictureKey]; exists {
				profilePictureURL = &url
			}
		}

		users = append(users, models.CommentReactionUser{
			UserID:            row.UserID,
			Name:              row.Name,
			Username:          row.Username,
			ProfilePictureURL: profilePictureURL,
		})
	}

	return &models.CommentReactionUsersResponse{
		CommentID: commentID,
		Emoji:     emoji,
		Users:     users,
	}, nil
}
