package repository

import (
	"context"
	"database/sql"
	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

var _ UserRepository = (*userRepository)(nil)

type userRepository struct {
	db *bun.DB
}

func (r *userRepository) Create(ctx context.Context, req *models.User) (*models.User, error) {
	_, err := r.db.NewInsert().
		Model(req).
		Returning("id", "name", "email").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return req, nil
}

func (r *userRepository) Find(ctx context.Context, id uuid.UUID) (*models.User, error) {
	u := &models.User{}
	err := r.db.NewSelect().
		Model(u).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return u, nil
}

func (r *userRepository) Update(ctx context.Context, id uuid.UUID, req *models.UpdateUserRequest) (*models.User, error) {
	u := &models.User{}
	query := r.db.NewUpdate().
		Model(u).
		Where("id = ?", id).
		Returning("*")

	if req.Name != nil {
		query = query.Set("name = ?", *req.Name)
	}
	if req.Email != nil {
		query = query.Set("email = ?", *req.Email)
	}

	res, err := query.Exec(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rows == 0 {
		return nil, errs.ErrNotFound
	}

	return u, nil
}

func (r *userRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.NewDelete().
		Model((*models.User)(nil)).
		Where("id = ?", id).
		Exec(ctx)

	return err
}
