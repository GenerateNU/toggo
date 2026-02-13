package repository

import (
	"context"
	"database/sql"
	"errors"
	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

var _ TripInviteRepository = (*tripInviteRepository)(nil)

type tripInviteRepository struct {
	db *bun.DB
}

func newTripInviteRepository(db *bun.DB) TripInviteRepository {
	return &tripInviteRepository{db: db}
}

// Create inserts a new trip invite.
func (r *tripInviteRepository) Create(ctx context.Context, invite *models.TripInvite) (*models.TripInvite, error) {
	_, err := r.db.NewInsert().
		Model(invite).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return invite, nil
}

// FindByID returns a trip invite by id.
func (r *tripInviteRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.TripInvite, error) {
	invite := &models.TripInvite{}
	err := r.db.NewSelect().
		Model(invite).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return invite, nil
}

// FindByCode returns a trip invite by its code.
func (r *tripInviteRepository) FindByCode(ctx context.Context, code string) (*models.TripInvite, error) {
	invite := &models.TripInvite{}
	err := r.db.NewSelect().
		Model(invite).
		Where("code = ?", code).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return invite, nil
}
