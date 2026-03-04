package repository

import (
	"context"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

var _ ActivityRSVPRepository = (*activityRSVPRepository)(nil)

type activityRSVPRepository struct {
	db *bun.DB
}

func (r *activityRSVPRepository) GetActivityRSVPs(ctx context.Context, tripID, activityID, userID uuid.UUID, limit int, cursorToken string, statusFilter string) ([]models.ActivityRSVPDatabaseResponse, *string, error) {
	var rsvps []models.ActivityRSVPDatabaseResponse

	query := r.db.NewSelect().
		Model(&rsvps).
		Table("activity_rsvps").
		Join("JOIN users ON activity_rsvps.user_id = users.id").
		Join("JOIN activities ON activity_rsvps.activity_id = activities.id").
		Where("activity_rsvps.activity_id = ?", activityID).
		Where("activities.trip_id = ?", tripID)

	if statusFilter != "" {
		query.Where("activity_rsvps.status = ?", statusFilter)
	}

	if cursorToken != "" {
		query.Where("activity_rsvps.created_at < ?", cursorToken)
	}

	err := query.Order("activity_rsvps.created_at DESC").Limit(limit).Scan(ctx)
	if err != nil {
		return nil, nil, err
	}

	var nextCursor *string
	if len(rsvps) == limit {
		last := rsvps[len(rsvps)-1]
		token := last.CreatedAt.Format("2006-01-02T15:04:05.000Z07:00")
		nextCursor = &token
	}

	return rsvps, nextCursor, nil
}

func (r *activityRSVPRepository) UpdateRSVP(ctx context.Context, activityID, userID uuid.UUID, status models.RSVPStatus) (*models.ActivityRSVP, error) {
	rsvp := &models.ActivityRSVP{
		ActivityID: activityID,
		UserID:     userID,
		Status:     status,
	}

	// Use upsert to insert or update the RSVP
	_, err := r.db.NewInsert().Model(rsvp).On("CONFLICT (activity_id, user_id) DO UPDATE").Set("status = EXCLUDED.status, updated_at = NOW()").Exec(ctx)
	if err != nil {
		return nil, err
	}

	return rsvp, nil
}