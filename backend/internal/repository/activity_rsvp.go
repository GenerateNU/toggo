package repository

import (
	"context"
	"fmt"
	"time"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

var _ ActivityRSVPRepository = (*activityRSVPRepository)(nil)

type activityRSVPRepository struct {
	db *bun.DB
}

func (r *activityRSVPRepository) GetActivityRSVPs(
	ctx context.Context,
	tripID, activityID, userID uuid.UUID,
	limit int,
	cursorToken string,
	statusFilter string,
) ([]models.ActivityRSVPDatabaseResponse, *string, error) {

	var rsvps []models.ActivityRSVPDatabaseResponse

	query := r.db.NewSelect().
		Table("activity_rsvps AS ar").
		ColumnExpr(`
			ar.activity_id,
			ar.user_id,
			ar.status,
			ar.created_at,
			ar.updated_at,
			u.username,
			u.profile_picture_key
		`).
		Join("JOIN users u ON ar.user_id = u.id").
		Join("JOIN activities a ON ar.activity_id = a.id").
		Where("ar.activity_id = ?", activityID).
		Where("a.trip_id = ?", tripID).
		Order("ar.created_at DESC").
		Limit(limit)

	fmt.Printf("[DEBUG] GetActivityRSVPs: tripID=%v activityID=%v userID=%v limit=%d cursorToken=%v statusFilter=%v\n",
		tripID, activityID, userID, limit, cursorToken, statusFilter)

	if statusFilter != "" {
		query.Where("ar.status = ?", statusFilter)
	}

	if cursorToken != "" {
		query.Where("ar.created_at < ?", cursorToken)
	}

	err := query.Scan(ctx, &rsvps)
	if err != nil {
		fmt.Printf("[ERROR] GetActivityRSVPs query failed: %v\n", err)
		return nil, nil, err
	}

	var nextCursor *string
	if len(rsvps) == limit {
		last := rsvps[len(rsvps)-1]
		token := last.CreatedAt.Format(time.RFC3339Nano)
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

	fmt.Printf("[DEBUG] UpdateRSVP: activityID=%v userID=%v status=%v\n", activityID, userID, status)
	_, err := r.db.NewInsert().Model(rsvp).Table("activity_rsvps").On("CONFLICT (trip_id, activity_id, user_id) DO UPDATE").Set("status = EXCLUDED.status, updated_at = NOW()").Exec(ctx)
	if err != nil {
		fmt.Printf("[ERROR] UpdateRSVP upsert failed: %v\n", err)
		return nil, err
	}

	return rsvp, nil
}
