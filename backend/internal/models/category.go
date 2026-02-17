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
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CategoryListResponse for listing categories
type CategoryListResponse struct {
	Categories []*CategoryAPIResponse `json:"categories"`
}