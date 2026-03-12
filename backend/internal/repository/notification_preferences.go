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

type NotificationPreferencesRepository interface {
	Create(ctx context.Context, prefs *models.NotificationPreferences) (*models.NotificationPreferences, error)
	Find(ctx context.Context, userID uuid.UUID) (*models.NotificationPreferences, error)
	Update(ctx context.Context, userID uuid.UUID, req *models.UpdateNotificationPreferencesRequest) (*models.NotificationPreferences, error)
	Delete(ctx context.Context, userID uuid.UUID) error
	Upsert(ctx context.Context, prefs *models.NotificationPreferences) (*models.NotificationPreferences, error)
}

var _ NotificationPreferencesRepository = (*notificationPreferencesRepository)(nil)

type notificationPreferencesRepository struct {
	db *bun.DB
}

func NewNotificationPreferencesRepository(db *bun.DB) NotificationPreferencesRepository {
	return &notificationPreferencesRepository{db: db}
}

func (r *notificationPreferencesRepository) Create(ctx context.Context, prefs *models.NotificationPreferences) (*models.NotificationPreferences, error) {
	_, err := r.db.NewInsert().
		Model(prefs).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return prefs, nil
}

func (r *notificationPreferencesRepository) Find(ctx context.Context, userID uuid.UUID) (*models.NotificationPreferences, error) {
	prefs := &models.NotificationPreferences{}
	err := r.db.NewSelect().
		Model(prefs).
		Where("user_id = ?", userID).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errs.ErrNotFound
		}
		return nil, err
	}
	return prefs, nil
}

func (r *notificationPreferencesRepository) Update(ctx context.Context, userID uuid.UUID, req *models.UpdateNotificationPreferencesRequest) (*models.NotificationPreferences, error) {
	updateQuery := r.db.NewUpdate().
		Model(&models.NotificationPreferences{}).
		Where("user_id = ?", userID)

	if req.PushEnabled != nil {
		updateQuery = updateQuery.Set("push_enabled = ?", *req.PushEnabled)
	}

	if req.UpcomingTrip != nil {
		updateQuery = updateQuery.Set("upcoming_trip = ?", *req.UpcomingTrip)
	}

	if req.VotingReminders != nil {
		updateQuery = updateQuery.Set("voting_reminders = ?", *req.VotingReminders)
	}

	if req.FinalizedDecisions != nil {
		updateQuery = updateQuery.Set("finalized_decisions = ?", *req.FinalizedDecisions)
	}

	if req.TripActivity != nil {
		updateQuery = updateQuery.Set("trip_activity = ?", *req.TripActivity)
	}

	if req.DeadlineReminders != nil {
		updateQuery = updateQuery.Set("deadline_reminders = ?", *req.DeadlineReminders)
	}

	updateQuery = updateQuery.Set("updated_at = NOW()")

	result, err := updateQuery.Exec(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to update notification preferences: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("failed to check update result: %w", err)
	}

	if rowsAffected == 0 {
		return nil, errs.ErrNotFound
	}

	updatedPrefs := &models.NotificationPreferences{}
	err = r.db.NewSelect().
		Model(updatedPrefs).
		Where("user_id = ?", userID).
		Scan(ctx)

	if err != nil {
		return nil, fmt.Errorf("failed to fetch updated notification preferences: %w", err)
	}

	return updatedPrefs, nil
}

func (r *notificationPreferencesRepository) Delete(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.NewDelete().
		Model((*models.NotificationPreferences)(nil)).
		Where("user_id = ?", userID).
		Exec(ctx)

	return err
}

func (r *notificationPreferencesRepository) Upsert(ctx context.Context, prefs *models.NotificationPreferences) (*models.NotificationPreferences, error) {
	_, err := r.db.NewInsert().
		Model(prefs).
		On("CONFLICT (user_id) DO UPDATE").
		Set("push_enabled = EXCLUDED.push_enabled").
		Set("upcoming_trip = EXCLUDED.upcoming_trip").
		Set("voting_reminders = EXCLUDED.voting_reminders").
		Set("finalized_decisions = EXCLUDED.finalized_decisions").
		Set("trip_activity = EXCLUDED.trip_activity").
		Set("deadline_reminders = EXCLUDED.deadline_reminders").
		Set("updated_at = NOW()").
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to upsert notification preferences: %w", err)
	}
	return prefs, nil
}
