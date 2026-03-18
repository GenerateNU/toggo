package repository

import (
	"context"
	"regexp"
	"strings"
	"toggo/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type SearchRepository interface {
	SearchTrips(ctx context.Context, userID uuid.UUID, query string, limit, offset int) ([]*models.TripDatabaseResponse, int, error)
	SearchActivities(ctx context.Context, tripID uuid.UUID, query string, limit, offset int) ([]*models.ActivityDatabaseResponse, int, error)
	SearchTripMembers(ctx context.Context, tripID uuid.UUID, query string, limit, offset int) ([]*models.MembershipDatabaseResponse, int, error)
}

var _ SearchRepository = (*searchRepository)(nil)

type searchRepository struct {
	db *bun.DB
}

func NewSearchRepository(db *bun.DB) SearchRepository {
	return &searchRepository{db: db}
}

var tsquerySanitizer = regexp.MustCompile(`[^a-zA-Z0-9\s]+`)

// formatPrefixQuery converts a user query into a tsquery format that supports prefix matching.
// It sanitizes the input, splits it into words, adds the :* wildcard to each word for prefix matching,
// and joins them with & (AND operator).
func formatPrefixQuery(query string) string {
	// Remove special characters that could break tsquery syntax
	// Keep only alphanumeric and spaces (hyphens are treated as separators)
	cleaned := tsquerySanitizer.ReplaceAllString(query, " ")

	words := strings.Fields(cleaned)
	if len(words) == 0 {
		return ""
	}

	// Add :* to each word for prefix matching and join with &
	for i, word := range words {
		words[i] = strings.ToLower(word) + ":*"
	}

	return strings.Join(words, " & ")
}

// SearchTrips performs a full-text search over trips the given user is a member of.
// Results are ranked by relevance then recency. Returns rows and total count.
// Supports prefix matching (e.g., 'beac' matches 'beach').
func (r *searchRepository) SearchTrips(
	ctx context.Context,
	userID uuid.UUID,
	query string,
	limit, offset int,
) ([]*models.TripDatabaseResponse, int, error) {
	tsQuery := formatPrefixQuery(query)
	if tsQuery == "" {
		return []*models.TripDatabaseResponse{}, 0, nil
	}

	base := r.db.NewSelect().
		TableExpr("trips AS t").
		Join("JOIN memberships AS m ON m.trip_id = t.id").
		Where("m.user_id = ?", userID).
		Where("to_tsvector('english', t.name) @@ to_tsquery('english', ?)", tsQuery)

	total, err := base.Clone().Count(ctx)
	if err != nil {
		return nil, 0, err
	}

	var rows []*models.TripDatabaseResponse
	err = base.Clone().
		Join("LEFT JOIN images AS img ON t.cover_image IS NOT NULL AND img.image_id = t.cover_image AND img.size = ? AND img.status = ?",
			models.ImageSizeMedium, models.UploadStatusConfirmed).
		ColumnExpr("t.id AS trip_id, t.name, t.budget_min, t.budget_max, t.currency, t.created_at, t.updated_at").
		ColumnExpr("t.cover_image").
		ColumnExpr("img.file_key AS cover_image_key").
		OrderExpr("ts_rank(to_tsvector('english', t.name), to_tsquery('english', ?)) DESC, t.created_at DESC", tsQuery).
		Limit(limit).
		Offset(offset).
		Scan(ctx, &rows)
	if err != nil {
		return nil, 0, err
	}

	return rows, total, nil
}

// SearchActivities performs a full-text search over activities within a trip.
// Supports prefix matching (e.g., 'surf' matches 'surfing').
func (r *searchRepository) SearchActivities(
	ctx context.Context,
	tripID uuid.UUID,
	query string,
	limit, offset int,
) ([]*models.ActivityDatabaseResponse, int, error) {
	tsQuery := formatPrefixQuery(query)
	if tsQuery == "" {
		return []*models.ActivityDatabaseResponse{}, 0, nil
	}

	base := r.db.NewSelect().
		TableExpr("activities AS a").
		Join("LEFT JOIN users AS u ON u.id = a.proposed_by").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?",
			models.ImageSizeSmall, models.UploadStatusConfirmed).
		Where("a.trip_id = ?", tripID).
		Where("to_tsvector('english', a.name) @@ to_tsquery('english', ?)", tsQuery)

	total, err := base.Clone().Count(ctx)
	if err != nil {
		return nil, 0, err
	}

	var rows []*models.ActivityDatabaseResponse
	err = base.Clone().
		ColumnExpr("a.*").
		ColumnExpr("u.username AS proposer_username").
		ColumnExpr("u.profile_picture AS proposer_picture_id").
		ColumnExpr("img.file_key AS proposer_picture_key").
		OrderExpr("ts_rank(to_tsvector('english', a.name), to_tsquery('english', ?)) DESC, a.created_at DESC", tsQuery).
		Limit(limit).
		Offset(offset).
		Scan(ctx, &rows)
	if err != nil {
		return nil, 0, err
	}

	return rows, total, nil
}

// SearchTripMembers performs a full-text search over the users belonging to a trip,
// matching against both user name and username.
// Supports prefix matching (e.g., 'ali' matches 'alice').
func (r *searchRepository) SearchTripMembers(
	ctx context.Context,
	tripID uuid.UUID,
	query string,
	limit, offset int,
) ([]*models.MembershipDatabaseResponse, int, error) {
	tsQuery := formatPrefixQuery(query)
	if tsQuery == "" {
		return []*models.MembershipDatabaseResponse{}, 0, nil
	}

	base := r.db.NewSelect().
		TableExpr("memberships AS m").
		Join("JOIN users AS u ON u.id = m.user_id").
		Join("LEFT JOIN images AS img ON u.profile_picture IS NOT NULL AND img.image_id = u.profile_picture AND img.size = ? AND img.status = ?",
			models.ImageSizeSmall, models.UploadStatusConfirmed).
		Where("m.trip_id = ?", tripID).
		Where("to_tsvector('english', u.name || ' ' || u.username) @@ to_tsquery('english', ?)", tsQuery)

	total, err := base.Clone().Count(ctx)
	if err != nil {
		return nil, 0, err
	}

	var rows []*models.MembershipDatabaseResponse
	err = base.Clone().
		ColumnExpr("m.user_id, m.trip_id, m.is_admin, m.created_at, m.updated_at, m.budget_min, m.budget_max, m.availability").
		ColumnExpr("u.username").
		ColumnExpr("u.profile_picture AS profile_picture_id").
		ColumnExpr("img.file_key AS profile_picture_key").
		OrderExpr("ts_rank(to_tsvector('english', u.name || ' ' || u.username), to_tsquery('english', ?)) DESC, m.created_at DESC", tsQuery).
		Limit(limit).
		Offset(offset).
		Scan(ctx, &rows)
	if err != nil {
		return nil, 0, err
	}

	return rows, total, nil
}
