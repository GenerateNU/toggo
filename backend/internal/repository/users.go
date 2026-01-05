package repository

import (
	"context"
	"database/sql"
	"fmt"
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
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return u, nil
}

func (r *userRepository) Update(ctx context.Context, id uuid.UUID, req *models.UpdateUserRequest) (*models.User, error) {
	updateQuery := r.db.NewUpdate().
		Model(&models.User{}).
		Where("id = ?", id)

	updates := make(map[string]interface{})

	if req.Name != nil {
		updates["name"] = *req.Name
		updateQuery = updateQuery.Set("name = ?", *req.Name)
	}

	if req.Email != nil {
		updates["email"] = *req.Email
		updateQuery = updateQuery.Set("email = ?", *req.Email)
	}

	result, err := updateQuery.Exec(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("failed to check update result: %w", err)
	}

	if rowsAffected == 0 {
		return nil, errs.ErrNotFound
	}

	updatedUser := &models.User{}
	err = r.db.NewSelect().
		Model(updatedUser).
		Where("id = ?", id).
		Scan(ctx)

	if err != nil {
		return nil, fmt.Errorf("failed to fetch updated user: %w", err)
	}

	return updatedUser, nil
}

func (r *userRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.NewDelete().
		Model((*models.User)(nil)).
		Where("id = ?", id).
		Exec(ctx)

	return err
}
