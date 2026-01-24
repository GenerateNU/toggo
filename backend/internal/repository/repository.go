package repository

import (
	"context"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Repository struct {
	User       UserRepository
	Health     HealthRepository
	Trip       TripRepository
	Membership MembershipRepository
}

func NewRepository(db *bun.DB) *Repository {
	return &Repository{
		User:       &userRepository{db: db},
		Health:     &healthRepository{db: db},
		Trip:       &tripRepository{db: db},
		Membership: &membershipRepository{db: db},
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
}

type TripRepository interface {
	Create(ctx context.Context, trip *models.Trip) (*models.Trip, error)
	Find(ctx context.Context, id uuid.UUID) (*models.Trip, error)
	FindAll(ctx context.Context) ([]*models.Trip, error)
	Update(ctx context.Context, id uuid.UUID, req *models.UpdateTripRequest) (*models.Trip, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type MembershipRepository interface {
	Create(ctx context.Context, membership *models.Membership) (*models.Membership, error)
	Find(ctx context.Context, userID, tripID uuid.UUID) (*models.Membership, error)
	FindByTripID(ctx context.Context, tripID uuid.UUID) ([]*models.Membership, error)
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]*models.Membership, error)
	IsMember(ctx context.Context, tripID, userID uuid.UUID) (bool, error)
	IsAdmin(ctx context.Context, tripID, userID uuid.UUID) (bool, error)
	CountMembers(ctx context.Context, tripID uuid.UUID) (int, error)
	Update(ctx context.Context, userID, tripID uuid.UUID, req *models.UpdateMembershipRequest) (*models.Membership, error)
	Delete(ctx context.Context, userID, tripID uuid.UUID) error
}