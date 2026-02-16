package repository

import (
	"context"
	"time"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Repository struct {
	User       UserRepository
	Health     HealthRepository
	Image      ImageRepository
	Comment    CommentRepository
	Membership MembershipRepository
	Trip       TripRepository
	Poll       PollRepository
	TripInvite  TripInviteRepository
	db          *bun.DB
}

// interfaces that use the provided *bun.DB as their backing store.
func NewRepository(db *bun.DB) *Repository {
	return &Repository{
		User:       &userRepository{db: db},
		Health:     &healthRepository{db: db},
		Image:      &imageRepository{db: db},
		Comment:    &commentRepository{db: db},
		Trip:       &tripRepository{db: db},
		Poll:       &pollRepository{db: db},
		Membership: &membershipRepository{db: db},
		TripInvite: newTripInviteRepository(db),
		db:         db,
	}
}

// GetDB returns the underlying database connection for transactions
func (r *Repository) GetDB() *bun.DB {
	return r.db
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

type TripRepository interface {
	Create(ctx context.Context, trip *models.Trip) (*models.Trip, error)
	Find(ctx context.Context, id uuid.UUID) (*models.Trip, error)
	FindWithCoverImage(ctx context.Context, id uuid.UUID) (*models.TripDatabaseResponse, error)
	FindAllWithCursorAndCoverImage(ctx context.Context, userID uuid.UUID, limit int, cursor *models.TripCursor) ([]*models.TripDatabaseResponse, *models.TripCursor, error)
	FindAllWithCursor(ctx context.Context, userID uuid.UUID, limit int, cursor *models.TripCursor) ([]*models.Trip, *models.TripCursor, error)
	Update(ctx context.Context, id uuid.UUID, req *models.UpdateTripRequest) (*models.Trip, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type TripInviteRepository interface {
	Create(ctx context.Context, invite *models.TripInvite) (*models.TripInvite, error)
	FindByID(ctx context.Context, id uuid.UUID) (*models.TripInvite, error)
	FindByCode(ctx context.Context, code string) (*models.TripInvite, error)
}

type MembershipRepository interface {
	Create(ctx context.Context, membership *models.Membership) (*models.Membership, error)
	Find(ctx context.Context, userID, tripID uuid.UUID) (*models.MembershipDatabaseResponse, error)
	FindByTripID(ctx context.Context, tripID uuid.UUID) ([]*models.MembershipDatabaseResponse, error)
	FindByTripIDWithCursor(ctx context.Context, tripID uuid.UUID, limit int, cursor *models.MembershipCursor) ([]*models.MembershipDatabaseResponse, *models.MembershipCursor, error)
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]*models.Membership, error)
	IsMember(ctx context.Context, tripID, userID uuid.UUID) (bool, error)
	IsAdmin(ctx context.Context, tripID, userID uuid.UUID) (bool, error)
	CountMembers(ctx context.Context, tripID uuid.UUID) (int, error)
	CountAdmins(ctx context.Context, tripID uuid.UUID) (int, error)
	Update(ctx context.Context, userID, tripID uuid.UUID, req *models.UpdateMembershipRequest) (*models.Membership, error)
	Delete(ctx context.Context, userID, tripID uuid.UUID) error
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
	Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, content string) (*models.Comment, error)
	Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	FindPaginatedComments(ctx context.Context, tripID uuid.UUID, entityType models.EntityType, entityID uuid.UUID, limit int, cursor *models.CommentCursor) ([]*models.CommentDatabaseResponse, error)
}