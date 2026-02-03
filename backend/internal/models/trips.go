package models

import (
	"time"

	"github.com/google/uuid"
)

type Trip struct {
	ID           uuid.UUID  `bun:"id,pk,type:uuid" json:"id"`
	Name         string     `bun:"name" json:"name"`
	CoverImageID *uuid.UUID `bun:"cover_image,type:uuid" json:"cover_image_id,omitempty"`
	BudgetMin    int        `bun:"budget_min" json:"budget_min"`
	BudgetMax    int        `bun:"budget_max" json:"budget_max"`
	CreatedAt    time.Time  `bun:"created_at,nullzero" json:"created_at"`
	UpdatedAt    time.Time  `bun:"updated_at,nullzero" json:"updated_at"`
}

type CreateTripRequest struct {
	Name         string     `validate:"required,min=1" json:"name"`
	BudgetMin    int        `json:"budget_min" validate:"required,gte=0"`
	CoverImageID *uuid.UUID `json:"cover_image_id,omitempty"`
	BudgetMax    int        `json:"budget_max" validate:"required,gte=0,gtefield=BudgetMin"`
}

type UpdateTripRequest struct {
	Name         *string    `validate:"omitempty,min=1" json:"name"`
	BudgetMin    *int       `json:"budget_min" validate:"omitempty,gte=0"`
	CoverImageID *uuid.UUID `json:"cover_image_id,omitempty"`
	BudgetMax    *int       `json:"budget_max" validate:"omitempty,gte=0,gtefield=BudgetMin"`
}

// TripPageResult holds an offset-paginated list of trips and metadata.
type TripPageResult struct {
	Items  []*Trip `json:"items"`
	Total  int     `json:"total"`
	Limit  int     `json:"limit"`
	Offset int     `json:"offset"`
}

// TripCursor is the sort key for cursor-based pagination (created_at DESC, id DESC).
type TripCursor = TimeUUIDCursor

// TripCursorPageResult holds a cursor-paginated list of trips and the next cursor.
type TripCursorPageResult struct {
	Items      []*TripAPIResponse `json:"items"`
	NextCursor *string            `json:"next_cursor,omitempty"`
	Limit      int                `json:"limit"`
}

type TripDatabaseResponse struct {
	TripID        uuid.UUID  `bun:"trip_id"`
	Name          string     `bun:"name"`
	CoverImageID  *uuid.UUID `bun:"cover_image"`
	CoverImageKey *string    `bun:"cover_image_key"`
	BudgetMin     int        `bun:"budget_min"`
	BudgetMax     int        `bun:"budget_max"`
	CreatedAt     time.Time  `bun:"created_at"`
	UpdatedAt     time.Time  `bun:"updated_at"`
}

type TripAPIResponse struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	CoverImageURL *string   `json:"cover_image_url"`
	BudgetMin     int       `json:"budget_min"`
	BudgetMax     int       `json:"budget_max"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
