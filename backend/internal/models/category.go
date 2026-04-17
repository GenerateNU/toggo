package models

import (
	"time"

	"github.com/google/uuid"
)

// CategoryViewType controls how a tab renders: activity list vs mood board grid.
type CategoryViewType string

const (
	CategoryViewTypeActivity  CategoryViewType = "activity"
	CategoryViewTypeMoodboard CategoryViewType = "moodboard"
)

// DefaultCategoryNames are the system categories created automatically when a new trip is created
var DefaultCategoryNames = []string{"itinerary", "polls", "housing", "activities"}

// DefaultCategoryLabels maps default category names to their display labels
var DefaultCategoryLabels = map[string]string{
	"itinerary":  "Itinerary",
	"polls":      "Polls",
	"housing":    "Housing",
	"activities": "Activities",
}

// Category represents a category within a trip, identified by the combination of TripID and Name.
type Category struct {
	TripID    uuid.UUID        `bun:"trip_id,pk,type:uuid" json:"trip_id"`
	Name      string           `bun:"name,pk" json:"name"`
	Label     string           `bun:"label" json:"label"`
	Icon      *string          `bun:"icon" json:"icon,omitempty"`
	IsHidden  bool             `bun:"is_hidden" json:"is_hidden"`
	IsDefault bool             `bun:"is_default" json:"is_default"`
	ViewType  CategoryViewType `bun:"view_type" json:"view_type"`
	Position  int              `bun:"position" json:"position"`
	CreatedAt time.Time        `bun:"created_at,nullzero" json:"created_at"`
	UpdatedAt time.Time        `bun:"updated_at,nullzero" json:"updated_at"`
}

// CreateCategoryRequest for creating a new category
type CreateCategoryRequest struct {
	TripID   uuid.UUID         `validate:"required,uuid" json:"trip_id"`
	Name     string            `validate:"required,min=1,max=255" json:"name"`
	Label    string            `validate:"required,min=1,max=255" json:"label"`
	Icon     *string           `validate:"omitempty,max=255" json:"icon"`
	ViewType *CategoryViewType `validate:"omitempty,oneof=activity moodboard" json:"view_type,omitempty"`
}

// CategoryAPIResponse is returned to the frontend
type CategoryAPIResponse struct {
	TripID    uuid.UUID        `json:"trip_id"`
	Name      string           `json:"name"`
	Label     string           `json:"label"`
	Icon      *string          `json:"icon,omitempty"`
	IsHidden  *bool            `json:"is_hidden,omitempty"` // only present for admins
	IsDefault bool             `json:"is_default"`
	ViewType  CategoryViewType `json:"view_type"`
	Position  int              `json:"position"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
}

// CategoryListResponse for listing categories
type CategoryListResponse struct {
	Categories []*CategoryAPIResponse `json:"categories"`
}

// TabListResponse is returned for the tabs endpoint
type TabListResponse struct {
	Tabs []*CategoryAPIResponse `json:"tabs"`
}

// CategoryTabOrder represents a single category's new position in a reorder request
type CategoryTabOrder struct {
	Name     string `validate:"required,min=1" json:"name"`
	Position int    `validate:"min=0" json:"position"`
}

// UpdateCategoryTabOrderRequest is the payload for reordering tabs
type UpdateCategoryTabOrderRequest struct {
	Tabs []CategoryTabOrder `validate:"required,min=1" json:"tabs"`
}
