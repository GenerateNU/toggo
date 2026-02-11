package models

import (
	"time"

	"github.com/google/uuid"
)

// DateRange represents a start and end date
type DateRange struct {
	Start string `json:"start"` // ISO 8601 date format (YYYY-MM-DD)
	End   string `json:"end"`   // ISO 8601 date format (YYYY-MM-DD)
}

// Activity represents the activities table (no longer has category_name)
type Activity struct {
	ID           uuid.UUID    `bun:"id,pk,type:uuid,default:gen_random_uuid()" json:"id"`
	TripID       uuid.UUID    `bun:"trip_id,type:uuid" json:"trip_id"`
	ProposedBy   uuid.UUID    `bun:"proposed_by,type:uuid" json:"proposed_by"`
	Name         string       `bun:"name" json:"name"`
	ThumbnailURL *string      `bun:"thumbnail_url" json:"thumbnail_url,omitempty"`
	MediaURL     *string      `bun:"media_url" json:"media_url,omitempty"`
	Description  *string      `bun:"description" json:"description,omitempty"`
	Dates        *[]DateRange `bun:"dates,type:jsonb" json:"dates,omitempty"`
	CreatedAt    time.Time    `bun:"created_at,nullzero" json:"created_at"`
	UpdatedAt    time.Time    `bun:"updated_at,nullzero" json:"updated_at"`
}

// ActivityCategory represents the activity_categories join table
type ActivityCategory struct {
	ActivityID   uuid.UUID `bun:"activity_id,pk,type:uuid" json:"activity_id"`
	TripID       uuid.UUID `bun:"trip_id,type:uuid" json:"trip_id"`
	CategoryName string    `bun:"category_name,pk" json:"category_name"`
	CreatedAt    time.Time `bun:"created_at,nullzero" json:"created_at"`
}

// CreateActivityRequest for creating a new activity
type CreateActivityRequest struct {
	TripID       uuid.UUID    `validate:"required,uuid" json:"trip_id"`
	CategoryNames []string     `validate:"omitempty,dive,min=1,max=255" json:"category_names"` // Changed to array
	Name         string       `validate:"required,min=1,max=255" json:"name"`
	ThumbnailURL *string      `validate:"omitempty,url" json:"thumbnail_url"`
	MediaURL     *string      `validate:"omitempty,url" json:"media_url"`
	Description  *string      `validate:"omitempty" json:"description"`
	Dates        *[]DateRange `validate:"omitempty,dive" json:"dates"`
}

// UpdateActivityRequest for updating an existing activity
type UpdateActivityRequest struct {
	Name         *string      `validate:"omitempty,min=1,max=255" json:"name"`
	ThumbnailURL *string      `validate:"omitempty,url" json:"thumbnail_url"`
	MediaURL     *string      `validate:"omitempty,url" json:"media_url"`
	Description  *string      `validate:"omitempty" json:"description"`
	Dates        *[]DateRange `validate:"omitempty,dive" json:"dates"`
	// Note: categories are managed through separate endpoints now
}

// AddCategoryToActivityRequest for adding a category to an activity
type AddCategoryToActivityRequest struct {
	CategoryName string `validate:"required,min=1,max=255" json:"category_name"`
}

// ActivityCursor reuses the standard time+UUID cursor payload
type ActivityCursor = TimeUUIDCursor

// ActivityCursorPageResult for paginated activity responses
type ActivityCursorPageResult struct {
	Items      []*ActivityAPIResponse `json:"items"`
	NextCursor *string                `json:"next_cursor,omitempty"`
	Limit      int                    `json:"limit"`
}

// ActivityDatabaseResponse includes joined data from the database
type ActivityDatabaseResponse struct {
	ID                 uuid.UUID    `json:"id"`
	TripID             uuid.UUID    `json:"trip_id"`
	ProposedBy         uuid.UUID    `json:"proposed_by"`
	Name               string       `json:"name"`
	ThumbnailURL       *string      `json:"thumbnail_url,omitempty"`
	MediaURL           *string      `json:"media_url,omitempty"`
	Description        *string      `json:"description,omitempty"`
	Dates              *[]DateRange `json:"dates,omitempty"`
	CreatedAt          time.Time    `json:"created_at"`
	UpdatedAt          time.Time    `json:"updated_at"`
	ProposerUsername   string       `json:"proposer_username"`
	ProposerPictureID  *uuid.UUID   `json:"proposer_picture_id,omitempty"`
	ProposerPictureKey *string      `bun:"proposer_picture_key" json:"-"`
	CategoryNames      []string     `json:"category_names"` // Array of category names
}

// ActivityAPIResponse is returned to the frontend
type ActivityAPIResponse struct {
	ID                 uuid.UUID    `json:"id"`
	TripID             uuid.UUID    `json:"trip_id"`
	ProposedBy         uuid.UUID    `json:"proposed_by"`
	Name               string       `json:"name"`
	ThumbnailURL       *string      `json:"thumbnail_url,omitempty"`
	MediaURL           *string      `json:"media_url,omitempty"`
	Description        *string      `json:"description,omitempty"`
	Dates              *[]DateRange `json:"dates,omitempty"`
	CreatedAt          time.Time    `json:"created_at"`
	UpdatedAt          time.Time    `json:"updated_at"`
	ProposerUsername   string       `json:"proposer_username"`
	ProposerPictureURL *string      `json:"proposer_picture_url,omitempty"`
	CategoryNames      []string     `json:"category_names"` // Array of category names
}

// ActivityCategoryCursor for paginating categories
type ActivityCategoryCursor struct {
	CategoryName string `json:"category_name"`
}

// ActivityCategoriesPageResult for paginated category responses
type ActivityCategoriesPageResult struct {
	Categories []string `json:"categories"`
	NextCursor *string  `json:"next_cursor,omitempty"`
	Limit      int      `json:"limit"`
}