package repository

import (
	"context"

	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type commentRepository struct {
	db *bun.DB
}

func (r *commentRepository) Create(ctx context.Context, comment *models.Comment) (*models.Comment, error) {
	_, err := r.db.NewInsert().
		Model(comment).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return comment, nil
}

func (r *commentRepository) GetCommentsByEntity(ctx context.Context, tripID uuid.UUID, entityType models.EntityType, entityID uuid.UUID, limit *int, cursor *string) ([]*models.CommentDatabaseResponse, error) {
	var comments []*models.CommentDatabaseResponse

	query := r.db.NewSelect().
		Model(&comments).
		Column("comments.id", "comments.trip_id", "comments.entity_type", "comments.entity_id", "comments.user_id", "users.username", "users.profile_picture_key", "comments.content", "comments.created_at", "comments.updated_at").
		Join("JOIN users ON users.id = comments.user_id").
		Where("comments.trip_id = ?", tripID).
		Where("comments.entity_type = ?", entityType).
		Where("comments.entity_id = ?", entityID).
		Order("comments.created_at DESC")

	if limit != nil {
		query = query.Limit(*limit)
	}

	if cursor != nil {
		query = query.Where("comments.created_at < ?", *cursor)
	}

	err := query.Scan(ctx)
	if err != nil {
		return nil, err
	}

	return comments, nil
}

func (r *commentRepository) Update(ctx context.Context, id uuid.UUID, content string) (*models.Comment, error) {
	comment := &models.Comment{
		Content: content,
	}
	result, err := r.db.NewUpdate().
		Model(comment).
		Column("content").
		Where("id = ?", id).
		Returning("*").
		Exec(ctx)

	if err != nil {
		return nil, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}

	if rowsAffected == 0 {
		return nil, errs.ErrNotFound
	}

	return comment, nil
}

func (r *commentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result, err := r.db.NewDelete().
		Model((*models.Comment)(nil)).
		Where("id = ?", id).
		Exec(ctx)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errs.ErrNotFound
	}

	return nil
}
