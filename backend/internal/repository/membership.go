package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"toggo/internal/errs"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type MembershipRepository interface {
	Create(ctx context.Context, membership *models.Membership) (*models.Membership, error)
	Find(ctx context.Context, userID, tripID uuid.UUID) (*models.MembershipDatabaseResponse, error)
	FindByTripID(ctx context.Context, tripID uuid.UUID) ([]*models.MembershipDatabaseResponse, error)
	FindByTripIDWithCursor(ctx context.Context, tripID uuid.UUID, limit int, cursor *models.MembershipCursor) ([]*models.MembershipDatabaseResponse, *models.MembershipCursor, error)
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]*models.Membership, error)
	FindUserIDsWithNotificationPreference(ctx context.Context, tripID uuid.UUID, preference models.NotificationPreference, excludeUserID uuid.UUID) ([]uuid.UUID, error)
	IsMember(ctx context.Context, tripID, userID uuid.UUID) (bool, error)
	IsAdmin(ctx context.Context, tripID, userID uuid.UUID) (bool, error)
	CountMembers(ctx context.Context, tripID uuid.UUID) (int, error)
	CountAdmins(ctx context.Context, tripID uuid.UUID) (int, error)
	GetMemberStatsForTrips(ctx context.Context, tripIDs []uuid.UUID) (map[uuid.UUID]*models.TripMemberStats, error)
	Update(ctx context.Context, userID, tripID uuid.UUID, req *models.UpdateMembershipRequest) (*models.Membership, error)
	UpdateNotificationPreferences(ctx context.Context, userID, tripID uuid.UUID, req *models.UpdateNotificationPreferencesRequest) (*models.Membership, error)
	Delete(ctx context.Context, userID, tripID uuid.UUID) error
}

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
func (r *membershipRepository) Find(ctx context.Context, userID, tripID uuid.UUID) (*models.MembershipDatabaseResponse, error) {
	membership := &models.MembershipDatabaseResponse{}
	err := r.db.NewSelect().
		TableExpr("memberships AS m").
		ColumnExpr("m.user_id, m.trip_id, m.is_admin, m.created_at, m.updated_at, m.budget_min, m.budget_max, m.availability").
		ColumnExpr("m.notify_new_pitches, m.notify_new_polls, m.notify_new_comments").
		ColumnExpr("u.name, u.username").
		ColumnExpr("u.profile_picture AS profile_picture_id").
		ColumnExpr("img.file_key AS profile_picture_key").
		Join("JOIN users AS u ON u.id = m.user_id").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?", models.ImageSizeSmall, models.UploadStatusConfirmed).
		Where("m.user_id = ? AND m.trip_id = ?", userID, tripID).
		Scan(ctx, membership)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return membership, nil
}

// FindByTripID retrieves all members of a trip
func (r *membershipRepository) FindByTripID(ctx context.Context, tripID uuid.UUID) ([]*models.MembershipDatabaseResponse, error) {
	var memberships []*models.MembershipDatabaseResponse
	err := r.db.NewSelect().
		TableExpr("memberships AS m").
		ColumnExpr("m.user_id, m.trip_id, m.is_admin, m.created_at, m.updated_at, m.budget_min, m.budget_max, m.availability").
		ColumnExpr("m.notify_new_pitches, m.notify_new_polls, m.notify_new_comments").
		ColumnExpr("u.name, u.username").
		ColumnExpr("u.profile_picture AS profile_picture_id").
		ColumnExpr("img.file_key AS profile_picture_key").
		Join("JOIN users AS u ON u.id = m.user_id").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?", models.ImageSizeSmall, models.UploadStatusConfirmed).
		Where("m.trip_id = ?", tripID).
		OrderExpr("m.created_at DESC, m.user_id DESC").
		Scan(ctx, &memberships)
	if err != nil {
		return nil, err
	}
	return memberships, nil
}

// FindByTripIDWithCursor retrieves trip members using cursor-based pagination.
func (r *membershipRepository) FindByTripIDWithCursor(ctx context.Context, tripID uuid.UUID, limit int, cursor *models.MembershipCursor) ([]*models.MembershipDatabaseResponse, *models.MembershipCursor, error) {
	fetchLimit := limit
	if fetchLimit < 1 {
		fetchLimit = 1
	}

	query := r.db.NewSelect().
		TableExpr("memberships AS m").
		ColumnExpr("m.user_id, m.trip_id, m.is_admin, m.created_at, m.updated_at, m.budget_min, m.budget_max, m.availability").
		ColumnExpr("m.notify_new_pitches, m.notify_new_polls, m.notify_new_comments").
		ColumnExpr("u.name, u.username").
		ColumnExpr("u.profile_picture AS profile_picture_id").
		ColumnExpr("img.file_key AS profile_picture_key").
		Join("JOIN users AS u ON u.id = m.user_id").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?", models.ImageSizeSmall, models.UploadStatusConfirmed).
		Where("m.trip_id = ?", tripID).
		OrderExpr("m.created_at DESC, m.user_id DESC").
		Limit(fetchLimit + 1)

	if cursor != nil {
		query = query.Where("(m.created_at < ?) OR (m.created_at = ? AND m.user_id < ?)", cursor.CreatedAt, cursor.CreatedAt, cursor.ID)
	}

	var memberships []*models.MembershipDatabaseResponse
	if err := query.Scan(ctx, &memberships); err != nil {
		return nil, nil, err
	}

	var nextCursor *models.MembershipCursor
	if len(memberships) > fetchLimit {
		lastVisible := memberships[fetchLimit-1]
		nextCursor = &models.MembershipCursor{CreatedAt: lastVisible.CreatedAt, ID: lastVisible.UserID}
		memberships = memberships[:fetchLimit]
	}

	return memberships, nextCursor, nil
}

func (r *membershipRepository) GetMemberStatsForTrips(ctx context.Context, tripIDs []uuid.UUID) (map[uuid.UUID]*models.TripMemberStats, error) {
	result := make(map[uuid.UUID]*models.TripMemberStats, len(tripIDs))
	if len(tripIDs) == 0 {
		return result, nil
	}

	type statsRow struct {
		TripID           uuid.UUID `bun:"trip_id"`
		UserID           uuid.UUID `bun:"user_id"`
		MemberName       string    `bun:"member_name"`
		MemberUsername   string    `bun:"member_username"`
		MemberPfpKey     *string   `bun:"member_pfp_key"`
		TotalMemberCount int       `bun:"total_member_count"`
	}

	var rows []statsRow
	err := r.db.NewSelect().
		TableExpr(`(
			SELECT
				m.trip_id,
				m.user_id,
				u.name                                                                                     AS member_name,
				u.username                                                                                 AS member_username,
				pfp.file_key                                                                               AS member_pfp_key,
				COUNT(*) OVER (PARTITION BY m.trip_id)                                                    AS total_member_count,
				ROW_NUMBER() OVER (PARTITION BY m.trip_id ORDER BY m.created_at, m.user_id)               AS rn
			FROM memberships AS m
			JOIN users AS u ON u.id = m.user_id
			LEFT JOIN images AS pfp
				ON u.profile_picture IS NOT NULL
				AND pfp.image_id = u.profile_picture
				AND pfp.size = ?
				AND pfp.status = ?
			WHERE m.trip_id IN (?)
		) AS ranked`,
			models.ImageSizeSmall,
			models.UploadStatusConfirmed,
			bun.In(tripIDs),
		).
		ColumnExpr("trip_id, user_id, member_name, member_username, member_pfp_key, total_member_count").
		Where("rn <= ?", 3).
		Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}

	for _, row := range rows {
		stats, ok := result[row.TripID]
		if !ok {
			stats = &models.TripMemberStats{Count: row.TotalMemberCount}
			result[row.TripID] = stats
		}
		stats.Previews = append(stats.Previews, models.TripMemberPreviewDB{
			UserID:            row.UserID,
			Name:              row.MemberName,
			Username:          row.MemberUsername,
			ProfilePictureKey: row.MemberPfpKey,
		})
	}

	for _, tripID := range tripIDs {
		if _, ok := result[tripID]; !ok {
			result[tripID] = &models.TripMemberStats{
				Count:    0,
				Previews: []models.TripMemberPreviewDB{},
			}
		}
	}

	return result, nil
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

// FindUserIDsWithNotificationPreference returns user IDs of trip members who have the given
// notification preference enabled, excluding the specified user.
func (r *membershipRepository) FindUserIDsWithNotificationPreference(ctx context.Context, tripID uuid.UUID, preference models.NotificationPreference, excludeUserID uuid.UUID) ([]uuid.UUID, error) {
	col, err := notificationPreferenceColumn(preference)
	if err != nil {
		return nil, err
	}

	var userIDs []uuid.UUID
	scanErr := r.db.NewSelect().
		TableExpr("memberships").
		ColumnExpr("user_id").
		Where("trip_id = ? AND user_id != ? AND "+col+" = TRUE", tripID, excludeUserID).
		Scan(ctx, &userIDs)
	if scanErr != nil {
		return nil, scanErr
	}
	return userIDs, nil
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
		if errors.Is(err, sql.ErrNoRows) {
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

// CountAdmins returns the number of admins in a trip
func (r *membershipRepository) CountAdmins(ctx context.Context, tripID uuid.UUID) (int, error) {
	count, err := r.db.NewSelect().
		Model((*models.Membership)(nil)).
		Where("trip_id = ? AND is_admin = true", tripID).
		Count(ctx)
	return count, err
}

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

// UpdateNotificationPreferences updates the notification preference flags for a membership.
func (r *membershipRepository) UpdateNotificationPreferences(ctx context.Context, userID, tripID uuid.UUID, req *models.UpdateNotificationPreferencesRequest) (*models.Membership, error) {
	updateQuery := r.db.NewUpdate().
		Model(&models.Membership{}).
		Where("user_id = ? AND trip_id = ?", userID, tripID)

	if req.NotifyNewPitches != nil {
		updateQuery = updateQuery.Set("notify_new_pitches = ?", *req.NotifyNewPitches)
	}

	if req.NotifyNewPolls != nil {
		updateQuery = updateQuery.Set("notify_new_polls = ?", *req.NotifyNewPolls)
	}

	if req.NotifyNewComments != nil {
		updateQuery = updateQuery.Set("notify_new_comments = ?", *req.NotifyNewComments)
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

	updated := &models.Membership{}
	if err := r.db.NewSelect().
		Model(updated).
		Where("user_id = ? AND trip_id = ?", userID, tripID).
		Scan(ctx); err != nil {
		return nil, err
	}

	return updated, nil
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

func notificationPreferenceColumn(preference models.NotificationPreference) (string, error) {
	switch preference {
	case models.NotificationPreferenceNewPitch:
		return "notify_new_pitches", nil
	case models.NotificationPreferenceNewPoll:
		return "notify_new_polls", nil
	case models.NotificationPreferenceNewComment:
		return "notify_new_comments", nil
	default:
		return "", fmt.Errorf("unknown notification preference: %s", preference)
	}
}
