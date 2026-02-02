package repository

import (
	"context"
	"database/sql"
	"toggo/internal/errs"
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

// Create adds a user to a trip
func (r *membershipRepository) Create(ctx context.Context, membership *models.Membership) (*models.Membership, error) {
	_, err := r.db.NewInsert().
		Model(membership).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return membership, nil
}

// Find retrieves a specific membership by composite primary key
func (r *membershipRepository) Find(ctx context.Context, userID, tripID uuid.UUID) (*models.Membership, error) {
	membership := &models.Membership{}
	err := r.db.NewSelect().
		Model(membership).
		Where("user_id = ? AND trip_id = ?", userID, tripID).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return membership, nil
}

// FindByTripID retrieves all members of a trip
func (r *membershipRepository) FindByTripID(ctx context.Context, tripID uuid.UUID) ([]*models.Membership, error) {
	var memberships []*models.Membership
	err := r.db.NewSelect().
		Model(&memberships).
		Where("trip_id = ?", tripID).
		Order("created_at DESC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return memberships, nil
}

// FindByUserID retrieves all trips a user is a member of
func (r *membershipRepository) FindByUserID(ctx context.Context, userID uuid.UUID) ([]*models.Membership, error) {
	var memberships []*models.Membership
	err := r.db.NewSelect().
		Model(&memberships).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return memberships, nil
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

// IsAdmin checks if a user is an admin of a trip
func (r *membershipRepository) IsAdmin(ctx context.Context, tripID, userID uuid.UUID) (bool, error) {
	membership := &models.Membership{}
	err := r.db.NewSelect().
		Model(membership).
		Where("trip_id = ? AND user_id = ? AND is_admin = true", tripID, userID).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// CountMembers returns the number of members in a trip
func (r *membershipRepository) CountMembers(ctx context.Context, tripID uuid.UUID) (int, error) {
	count, err := r.db.NewSelect().
		Model((*models.Membership)(nil)).
		Where("trip_id = ?", tripID).
		Count(ctx)
	return count, err
}

// Update modifies a membership
// Update modifies a membership
func (r *membershipRepository) Update(ctx context.Context, userID, tripID uuid.UUID, req *models.UpdateMembershipRequest) (*models.Membership, error) {
	updateQuery := r.db.NewUpdate().
		Model(&models.Membership{}).
		Where("user_id = ? AND trip_id = ?", userID, tripID)

	// Only update fields that are provided (not nil)
	if req.IsAdmin != nil {
		updateQuery = updateQuery.Set("is_admin = ?", *req.IsAdmin)
	}

	if req.BudgetMin != nil {
		updateQuery = updateQuery.Set("budget_min = ?", *req.BudgetMin)
	}

	if req.BudgetMax != nil {
		updateQuery = updateQuery.Set("budget_max = ?", *req.BudgetMax)
	}

	result, err := updateQuery.Exec(ctx)
	if err != nil {
		return nil, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}

	if rowsAffected == 0 {
		return nil, errs.ErrNotFound
	}

	updatedMembership := &models.Membership{}
	err = r.db.NewSelect().
		Model(updatedMembership).
		Where("user_id = ? AND trip_id = ?", userID, tripID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return updatedMembership, nil
}

// Delete removes a membership (idempotent)
func (r *membershipRepository) Delete(ctx context.Context, userID, tripID uuid.UUID) error {
	_, err := r.db.NewDelete().
		Model((*models.Membership)(nil)).
		Where("user_id = ? AND trip_id = ?", userID, tripID).
		Exec(ctx)

	// Idempotent - don't error if already deleted
	return err
}
