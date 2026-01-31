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

func (r *commentRepository) FindPaginatedComments(ctx context.Context, tripID uuid.UUID, entityType models.EntityType, entityID uuid.UUID, limit int, cursor *string) ([]*models.CommentDatabaseResponse, error) {
	var comments []*models.CommentDatabaseResponse

	query := r.db.NewSelect().
		TableExpr("comments AS c").
		ColumnExpr("c.id, c.trip_id, c.entity_type, c.entity_id, c.user_id, c.content, c.created_at, c.updated_at").
		ColumnExpr("u.username").
		ColumnExpr("img.file_key AS profile_picture_key").
		Join("JOIN users AS u ON u.id = c.user_id").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?", models.ImageSizeSmall, models.UploadStatusConfirmed).
		Where("c.trip_id = ?", tripID).
		Where("c.entity_type = ?", entityType).
		Where("c.entity_id = ?", entityID).
		Order("c.created_at DESC").
		Limit(limit + 1)

	if cursor != nil {
		query = query.Where("c.created_at < ?", *cursor)
	}

	err := query.Scan(ctx, &comments)
	if err != nil {
		return nil, err
	}

	return comments, nil
}

func (r *commentRepository) Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, content string) (*models.Comment, error) {
	comment := &models.Comment{
		ID:      id,
		Content: content,
	}
	result, err := r.db.NewUpdate().
		Model(comment).
		Column("content").
		Where("id = ?", id).
		Where("user_id = ?", userID).
		Where("EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = ? AND m.trip_id = comment.trip_id)", userID).
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

func (r *commentRepository) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	result, err := r.db.NewDelete().
		Model((*models.Comment)(nil)).
		Where("id = ?", id).
		Where("user_id = ?", userID).
		Where("EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = ? AND m.trip_id = comment.trip_id)", userID).
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
