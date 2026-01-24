package repository

import (
	"context"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Repository struct {
	User   UserRepository
	Health HealthRepository
}

func NewRepository(db *bun.DB) *Repository {
	return &Repository{
		User:   &userRepository{db: db},
		Health: &healthRepository{db: db},
	}
}

type HealthRepository interface {
	HealthCheck(ctx context.Context) (string, error)
}

type UserRepository interface {
	Create(ctx context.Context, user *models.User) (*models.User, error)
	Find(ctx context.Context, id uuid.UUID) (*models.User, error)
	Update(ctx context.Context, id uuid.UUID, user *models.UpdateUserRequest) (*models.User, error)
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateDeviceToken(ctx context.Context, id uuid.UUID, deviceToken string) (*models.User, error)
}
