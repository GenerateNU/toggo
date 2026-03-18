package models

import (
	"time"

	"github.com/google/uuid"
)

// DefaultCategoryNames are created automatically when a new trip is created
var DefaultCategoryNames = []string{"food", "lodging", "attraction", "transportation", "entertainment"}

// Category represents a category of expenses within a trip, identified by the combination of TripID and Name.
type Category struct {
	TripID    uuid.UUID `bun:"trip_id,pk,type:uuid" json:"trip_id"`
	Name      string    `bun:"name,pk" json:"name"`
	Icon      *string   `bun:"icon" json:"icon,omitempty"`
	IsHidden  bool      `bun:"is_hidden" json:"is_hidden"`
	Position  int       `bun:"position" json:"position"`
	CreatedAt time.Time `bun:"created_at,nullzero" json:"created_at"`
	UpdatedAt time.Time `bun:"updated_at,nullzero" json:"updated_at"`
}

// CreateCategoryRequest for creating a new category
type CreateCategoryRequest struct {
	TripID uuid.UUID `validate:"required,uuid" json:"trip_id"`
	Name   string    `validate:"required,min=1,max=255" json:"name"`
	Icon   *string   `validate:"omitempty,max=255" json:"icon"`
}

// CategoryAPIResponse is returned to the frontend
type CategoryAPIResponse struct {
	TripID    uuid.UUID `json:"trip_id"`
	Name      string    `json:"name"`
	Icon      *string   `json:"icon,omitempty"`
	IsHidden  *bool     `json:"is_hidden,omitempty"` // only present for admins
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CategoryListResponse for listing categories
type CategoryListResponse struct {
	Categories []*CategoryAPIResponse `json:"categories"`
}

// CategoryTabOrder represents a single category's new position in a reorder request
type CategoryTabOrder struct {
	TripID   uuid.UUID `validate:"required" json:"trip_id"`
	Name     string    `validate:"required,min=1" json:"name"`
	Position int       `validate:"min=0" json:"position"`
}

// UpdateCategoryTabOrderRequest is the payload for reordering tabs
type UpdateCategoryTabOrderRequest struct {
	Tabs []CategoryTabOrder `validate:"required,min=1" json:"tabs"`
}