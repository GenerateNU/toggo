package repository

import (
	"context"
	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type PitchLinkRepository interface {
	Create(ctx context.Context, link *models.PitchLink) (*models.PitchLink, error)
	FindByPitchID(ctx context.Context, pitchID uuid.UUID) ([]*models.PitchLink, error)
	FindByPitchIDs(ctx context.Context, pitchIDs []uuid.UUID) (map[uuid.UUID][]*models.PitchLink, error)
	Delete(ctx context.Context, id uuid.UUID, pitchID uuid.UUID) error
}

var _ PitchLinkRepository = (*pitchLinkRepository)(nil)

type pitchLinkRepository struct {
	db *bun.DB
}

func NewPitchLinkRepository(db *bun.DB) PitchLinkRepository {
	return &pitchLinkRepository{db: db}
}

func (r *pitchLinkRepository) Create(ctx context.Context, link *models.PitchLink) (*models.PitchLink, error) {
	_, err := r.db.NewInsert().
		Model(link).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return link, nil
}

func (r *pitchLinkRepository) FindByPitchID(ctx context.Context, pitchID uuid.UUID) ([]*models.PitchLink, error) {
	var links []*models.PitchLink
	err := r.db.NewSelect().
		Model(&links).
		Where("pitch_id = ?", pitchID).
		OrderExpr("created_at DESC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return links, nil
}

func (r *pitchLinkRepository) FindByPitchIDs(ctx context.Context, pitchIDs []uuid.UUID) (map[uuid.UUID][]*models.PitchLink, error) {
	result := make(map[uuid.UUID][]*models.PitchLink, len(pitchIDs))
	if len(pitchIDs) == 0 {
		return result, nil
	}
	var links []*models.PitchLink
	err := r.db.NewSelect().
		Model(&links).
		Where("pitch_id IN (?)", bun.In(pitchIDs)).
		OrderExpr("created_at DESC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	for _, link := range links {
		result[link.PitchID] = append(result[link.PitchID], link)
	}
	return result, nil
}

func (r *pitchLinkRepository) Delete(ctx context.Context, id uuid.UUID, pitchID uuid.UUID) error {
	result, err := r.db.NewDelete().
		Model((*models.PitchLink)(nil)).
		Where("id = ? AND pitch_id = ?", id, pitchID).
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
