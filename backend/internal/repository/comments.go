package repository

import (
	"context"

	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

// maxCommentPreviewCount is the maximum number of commenter previews returned per pitch.
const maxCommentPreviewCount = 3

type CommentRepository interface {
	Create(ctx context.Context, comment *models.Comment) (*models.Comment, error)
	Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, content string) (*models.Comment, error)
	Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	FindPaginatedComments(ctx context.Context, tripID uuid.UUID, entityType models.EntityType, entityID uuid.UUID, limit int, cursor *models.CommentCursor) ([]*models.CommentDatabaseResponse, error)
	GetCommentStatsForPitches(ctx context.Context, pitchIDs []uuid.UUID) (map[uuid.UUID]*models.PitchCommentStats, error)
}

var _ CommentRepository = (*commentRepository)(nil)

type commentRepository struct {
	db *bun.DB
}

func NewCommentRepository(db *bun.DB) CommentRepository {
	return &commentRepository{db: db}
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

func (r *commentRepository) FindPaginatedComments(ctx context.Context, tripID uuid.UUID, entityType models.EntityType, entityID uuid.UUID, limit int, cursor *models.CommentCursor) ([]*models.CommentDatabaseResponse, error) {
	var comments []*models.CommentDatabaseResponse

	query := r.db.NewSelect().
		TableExpr("comments AS c").
		ColumnExpr("c.id, c.trip_id, c.entity_type, c.entity_id, c.user_id, c.content, c.created_at, c.updated_at").
		ColumnExpr("u.name, u.username").
		ColumnExpr("u.profile_picture AS profile_picture_id").
		ColumnExpr("img.file_key AS profile_picture_key").
		Join("JOIN users AS u ON u.id = c.user_id").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?", models.ImageSizeSmall, models.UploadStatusConfirmed).
		Where("c.trip_id = ?", tripID).
		Where("c.entity_type = ?", entityType).
		Where("c.entity_id = ?", entityID).
		OrderExpr("c.created_at DESC, c.id DESC").
		Limit(limit + 1)

	if cursor != nil {
		query = query.Where("(c.created_at < ?) OR (c.created_at = ? AND c.id < ?)", cursor.CreatedAt, cursor.CreatedAt, cursor.ID)
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

// GetCommentStatsForPitches returns comment counts and the first maxCommentPreviewCount
// commenters for each pitch in a single query using window functions.
func (r *commentRepository) GetCommentStatsForPitches(ctx context.Context, pitchIDs []uuid.UUID) (map[uuid.UUID]*models.PitchCommentStats, error) {
	result := make(map[uuid.UUID]*models.PitchCommentStats, len(pitchIDs))
	if len(pitchIDs) == 0 {
		return result, nil
	}

	type statsRow struct {
		PitchID           uuid.UUID `bun:"pitch_id"`
		UserID            uuid.UUID `bun:"user_id"`
		CommenterName     string    `bun:"commenter_name"`
		CommenterUsername string    `bun:"commenter_username"`
		CommenterPfpKey   *string   `bun:"commenter_pfp_key"`
		TotalCommentCount int       `bun:"total_comment_count"`
	}

	var rows []statsRow
	err := r.db.NewSelect().
		TableExpr(`(
			SELECT
				c.entity_id                                                                               AS pitch_id,
				c.user_id,
				u.name                                                                                    AS commenter_name,
				u.username                                                                                AS commenter_username,
				pfp.file_key                                                                              AS commenter_pfp_key,
				SUM(COUNT(c.id)) OVER (PARTITION BY c.entity_id)                                         AS total_comment_count,
				ROW_NUMBER() OVER (PARTITION BY c.entity_id ORDER BY MIN(c.created_at))                  AS rn
			FROM comments AS c
			JOIN users AS u ON u.id = c.user_id
			LEFT JOIN images AS pfp
				ON u.profile_picture IS NOT NULL
				AND pfp.image_id = u.profile_picture
				AND pfp.size = ?
				AND pfp.status = ?
			WHERE c.entity_type = ?
			  AND c.entity_id IN (?)
			GROUP BY c.entity_id, c.user_id, u.name, u.username, pfp.file_key
		) AS ranked`,
			models.ImageSizeSmall,
			models.UploadStatusConfirmed,
			models.PitchEntity,
			bun.In(pitchIDs),
		).
		ColumnExpr("pitch_id, user_id, commenter_name, commenter_username, commenter_pfp_key, total_comment_count").
		Where("rn <= ?", maxCommentPreviewCount).
		Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}

	for _, row := range rows {
		stats, ok := result[row.PitchID]
		if !ok {
			stats = &models.PitchCommentStats{Count: row.TotalCommentCount}
			result[row.PitchID] = stats
		}
		stats.Previews = append(stats.Previews, models.PitchCommenterDB{
			UserID:            row.UserID,
			Name:              row.CommenterName,
			Username:          row.CommenterUsername,
			ProfilePictureKey: row.CommenterPfpKey,
		})
	}
	return result, nil
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
