package models

import (
	"time"

	"github.com/google/uuid"
)

type Trip struct {
	ID        uuid.UUID `bun:"id,pk,type:uuid" json:"id"`
	Name      string    `bun:"name" json:"name"`
	BudgetMin int       `bun:"budget_min" json:"budget_min"`
	BudgetMax int       `bun:"budget_max" json:"budget_max"`
	CreatedAt time.Time `bun:"created_at" json:"created_at"`
	UpdatedAt time.Time `bun:"updated_at" json:"updated_at"`
}

type CreateTripRequest struct {
	Name      string `validate:"required,min=1" json:"name"`
	BudgetMin int    `json:"budget_min" validate:"required,gte=0"`
	BudgetMax int    `json:"budget_max" validate:"required,gte=0,gtefield=BudgetMin"`
}

type UpdateTripRequest struct {
	Name      *string `validate:"omitempty,min=1" json:"name"`
	BudgetMin *int    `json:"budget_min" validate:"omitempty,gte=0"`
	BudgetMax *int    `json:"budget_max" validate:"omitempty,gte=0,gtefield=BudgetMin"`
}

type GetTripMembersResponse struct {
	Data []*Membership `json:"data"`
}

// TripPageResult holds an offset-paginated list of trips and metadata.
type TripPageResult struct {
	Items  []*Trip `json:"items"`
	Total  int     `json:"total"`
	Limit  int     `json:"limit"`
	Offset int     `json:"offset"`
}

// TripCursor is the sort key for cursor-based pagination (created_at DESC, id DESC).
type TripCursor struct {
	CreatedAt time.Time `json:"created_at"`
	ID        uuid.UUID `json:"id"`
}

// TripCursorPageResult holds a cursor-paginated list of trips and the next cursor.
type TripCursorPageResult struct {
	Items      []*Trip `json:"items"`
	NextCursor string  `json:"next_cursor,omitempty"`
	Limit      int     `json:"limit"`
}
