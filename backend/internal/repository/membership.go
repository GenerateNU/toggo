package repository

import (
	"context"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

var _ MembershipRepository = (*membershipRepository)(nil)

type membershipRepository struct {
	db *bun.DB
}

func NewMembershipRepository(db *bun.DB) MembershipRepository {
	return &membershipRepository{db: db}
}

// IsMember checks if a user is a member of a trip
func (r *membershipRepository) IsMember(ctx context.Context, tripID, userID uuid.UUID) (bool, error) {
	count, err := r.db.NewSelect().
		Model((*models.Membership)(nil)).
		Where("trip_id = ? AND user_id = ?", tripID, userID).
		Count(ctx)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
