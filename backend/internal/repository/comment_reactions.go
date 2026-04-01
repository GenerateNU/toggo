package repository

import (
	"context"

	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type CommentReactionRepository interface {
	EnsureCommentVisibleToUser(ctx context.Context, commentID uuid.UUID, userID uuid.UUID) error
	Create(ctx context.Context, reaction *models.CommentReaction) (*models.CommentReaction, error)
	DeleteByUserEmoji(ctx context.Context, commentID uuid.UUID, userID uuid.UUID, emoji string) error
	GetSummary(ctx context.Context, commentID uuid.UUID, currentUserID uuid.UUID) ([]models.CommentReactionSummary, error)
	ListUsersForEmoji(ctx context.Context, commentID uuid.UUID, emoji string) ([]CommentReactionUserDBRow, error)
}

var _ CommentReactionRepository = (*commentReactionRepository)(nil)

type commentReactionRepository struct {
	db *bun.DB
}

func NewCommentReactionRepository(db *bun.DB) CommentReactionRepository {
	return &commentReactionRepository{db: db}
}

func (r *commentReactionRepository) EnsureCommentVisibleToUser(ctx context.Context, commentID uuid.UUID, userID uuid.UUID) error {
	// Treat comment visibility as a DB concern:
	// - the comment must exist
	// - the user must be a member of the comment's trip
	var one int
	err := r.db.NewSelect().
		TableExpr("comments AS c").
		ColumnExpr("1").
		Where("c.id = ?", commentID).
		Where("EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = ? AND m.trip_id = c.trip_id)", userID).
		Limit(1).
		Scan(ctx, &one)
	if err != nil {
		return err
	}
	if one != 1 {
		return errs.ErrNotFound
	}
	return nil
}

func (r *commentReactionRepository) Create(ctx context.Context, reaction *models.CommentReaction) (*models.CommentReaction, error) {
	_, err := r.db.NewInsert().
		Model(reaction).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return reaction, nil
}

func (r *commentReactionRepository) DeleteByUserEmoji(ctx context.Context, commentID uuid.UUID, userID uuid.UUID, emoji string) error {
	_, err := r.db.NewDelete().
		Model((*models.CommentReaction)(nil)).
		Where("comment_id = ?", commentID).
		Where("user_id = ?", userID).
		Where("emoji = ?", emoji).
		Exec(ctx)
	return err
}

func (r *commentReactionRepository) GetSummary(ctx context.Context, commentID uuid.UUID, currentUserID uuid.UUID) ([]models.CommentReactionSummary, error) {
	type row struct {
		Emoji       string `bun:"emoji"`
		Count       int    `bun:"count"`
		ReactedByMe bool   `bun:"reacted_by_me"`
	}

	var rows []row
	err := r.db.NewSelect().
		TableExpr("comment_reactions AS cr").
		ColumnExpr("cr.emoji AS emoji").
		ColumnExpr("COUNT(*)::int AS count").
		ColumnExpr("BOOL_OR(cr.user_id = ?) AS reacted_by_me", currentUserID).
		Where("cr.comment_id = ?", commentID).
		GroupExpr("cr.emoji").
		OrderExpr("count DESC, cr.emoji ASC").
		Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}

	out := make([]models.CommentReactionSummary, 0, len(rows))
	for _, r := range rows {
		out = append(out, models.CommentReactionSummary{
			Emoji:       r.Emoji,
			Count:       r.Count,
			ReactedByMe: r.ReactedByMe,
		})
	}
	return out, nil
}

type CommentReactionUserDBRow struct {
	UserID            uuid.UUID  `json:"user_id"`
	Username          string     `json:"username"`
	ProfilePictureID  *uuid.UUID `json:"profile_picture_id"`
	ProfilePictureKey *string    `bun:"profile_picture_key" json:"-"`
}

func (r *commentReactionRepository) ListUsersForEmoji(ctx context.Context, commentID uuid.UUID, emoji string) ([]CommentReactionUserDBRow, error) {
	var users []CommentReactionUserDBRow

	err := r.db.NewSelect().
		TableExpr("comment_reactions AS cr").
		ColumnExpr("u.id AS user_id").
		ColumnExpr("u.username AS username").
		ColumnExpr("u.profile_picture AS profile_picture_id").
		ColumnExpr("img.file_key AS profile_picture_key").
		Join("JOIN users AS u ON u.id = cr.user_id").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?", models.ImageSizeSmall, models.UploadStatusConfirmed).
		Where("cr.comment_id = ?", commentID).
		Where("cr.emoji = ?", emoji).
		OrderExpr("u.username ASC, u.id ASC").
		Scan(ctx, &users)
	if err != nil {
		return nil, err
	}

	return users, nil
}

