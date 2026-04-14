package repository

import (
	"context"
	"time"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type ActivityRSVPRepository interface {
	UpdateRSVP(ctx context.Context, tripID, activityID, userID uuid.UUID, status models.RSVPStatus) (*models.ActivityRSVP, error)
	GetActivityRSVPs(ctx context.Context, tripID, activityID, userID uuid.UUID, limit int, cursorToken time.Time, statusFilter string) ([]models.ActivityRSVPDatabaseResponse, time.Time, error)
}

var _ ActivityRSVPRepository = (*activityRSVPRepository)(nil)

type activityRSVPRepository struct {
	db *bun.DB
}

func NewActivityRSVPRepository(db *bun.DB) ActivityRSVPRepository {
	return &activityRSVPRepository{db: db}
}

func (r *activityRSVPRepository) GetActivityRSVPs(
	ctx context.Context,
	tripID, activityID, userID uuid.UUID,
	limit int,
	cursorToken time.Time,
	statusFilter string,
) ([]models.ActivityRSVPDatabaseResponse, time.Time, error) {
	var rsvps []models.ActivityRSVPDatabaseResponse

	query := r.db.NewSelect().
		TableExpr("activity_rsvps AS ar").
		ColumnExpr(`
			ar.activity_id,
			ar.user_id,
			ar.status,
			ar.created_at,
			ar.updated_at,
			u.name,
			u.username,
			i.file_key AS profile_picture_key
		`).
		Join("JOIN users u ON u.id = ar.user_id").
		Join("JOIN trips t ON t.id = ar.trip_id").
		Join("LEFT JOIN images i ON i.image_id = u.profile_picture").
		Where("ar.activity_id = ?", activityID).
		Where("t.id = ?", tripID).
		Order("ar.created_at DESC").
		Limit(limit)

	if statusFilter != "" {
		query.Where("ar.status = ?", statusFilter)
	}

	if !cursorToken.IsZero() {
		query.Where("ar.created_at < ?", cursorToken)
	}

	err := query.Scan(ctx, &rsvps)
	if err != nil {
		return rsvps, time.Time{}, nil
	}

	var nextCursor time.Time
	if len(rsvps) == limit {
		last := rsvps[len(rsvps)-1]
		nextCursor = last.CreatedAt
	}

	return rsvps, nextCursor, nil
}

func (r *activityRSVPRepository) UpdateRSVP(ctx context.Context, tripID, activityID, userID uuid.UUID, status models.RSVPStatus) (*models.ActivityRSVP, error) {
	query := `
			INSERT INTO activity_rsvps (trip_id, activity_id, user_id, status)
			VALUES (?, ?, ?, ?)
			ON CONFLICT (trip_id, activity_id, user_id)
			DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
			RETURNING trip_id, activity_id, user_id, status, created_at, updated_at
		`
	rsvp := new(models.ActivityRSVP)
	err := r.db.QueryRowContext(ctx, query, tripID, activityID, userID, status).Scan(
		&rsvp.TripID,
		&rsvp.ActivityID,
		&rsvp.UserID,
		&rsvp.Status,
		&rsvp.CreatedAt,
		&rsvp.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return rsvp, nil
}
