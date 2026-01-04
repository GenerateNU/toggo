package repository

import (
	"context"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Repository struct {
	User UserRepository
}

func NewRepository(db *bun.DB) *Repository {
	return &Repository{
		User: &userRepository{db: db},
	}
}

type UserRepository interface {
	Create(ctx context.Context, user *models.User) (*models.User, error)
	Find(ctx context.Context, id uuid.UUID) (*models.User, error)
	Update(ctx context.Context, id uuid.UUID, user *models.UpdateUserRequest) (*models.User, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
