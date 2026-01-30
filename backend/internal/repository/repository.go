package repository

import (
	"context"
	"time"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Repository struct {
	User    UserRepository
	Health  HealthRepository
	Image   ImageRepository
	Comment CommentRepository
}

func NewRepository(db *bun.DB) *Repository {
	return &Repository{
		User:    &userRepository{db: db},
		Health:  &healthRepository{db: db},
		Image:   &imageRepository{db: db},
		Comment: &commentRepository{db: db},
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
	GetUsersWithDeviceTokens(ctx context.Context, userIDs []uuid.UUID) ([]*models.User, error)
}

type ImageRepository interface {
	CreatePendingImages(ctx context.Context, imageID uuid.UUID, fileKey string, sizes []models.ImageSize) ([]*models.Image, error)
	ConfirmUpload(ctx context.Context, imageID uuid.UUID, size models.ImageSize) (*models.Image, error)
	ConfirmAllUploads(ctx context.Context, imageID uuid.UUID) ([]*models.Image, error)
	MarkFailed(ctx context.Context, imageID uuid.UUID, size models.ImageSize) error
	FindByID(ctx context.Context, imageID uuid.UUID) ([]*models.Image, error)
	FindByIDAndSize(ctx context.Context, imageID uuid.UUID, size models.ImageSize) (*models.Image, error)
	FindByIDIncludingPending(ctx context.Context, imageID uuid.UUID) ([]*models.Image, error)
	DeleteByID(ctx context.Context, imageID uuid.UUID) error
	CleanupPendingUploads(ctx context.Context, olderThan time.Duration) (int64, error)
}

type CommentRepository interface {
	Create(ctx context.Context, comment *models.Comment) (*models.Comment, error)
	Update(ctx context.Context, id uuid.UUID, content string) (*models.Comment, error)
	Delete(ctx context.Context, id uuid.UUID) error
	FindPaginatedComments(ctx context.Context, tripID uuid.UUID, entityType models.EntityType, entityID uuid.UUID, limit *int, cursor *string) ([]*models.CommentDatabaseResponse, error)
}
