package models

import (
	"time"

	"github.com/google/uuid"
)

type Comment struct {
	ID         uuid.UUID  `bun:"id,pk,type:uuid,default:gen_random_uuid()" json:"id"`
	TripID     uuid.UUID  `bun:"trip_id,type:uuid,notnull" json:"trip_id"`
	EntityType EntityType `bun:"entity_type,notnull" json:"entity_type"`
	EntityID   uuid.UUID  `bun:"entity_id,type:uuid,notnull" json:"entity_id"`
	UserID     uuid.UUID  `bun:"user_id,type:uuid,notnull" json:"user_id"`
	Content    string     `bun:"content,notnull" json:"content"`
	CreatedAt  time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt  time.Time  `bun:"updated_at,nullzero,notnull,default:current_timestamp" json:"updated_at"`
}

type CreateCommentRequest struct {
	TripID     uuid.UUID  `validate:"required" json:"trip_id"`
	EntityType EntityType `validate:"required,oneof=activity pitch" json:"entity_type"`
	EntityID   uuid.UUID  `validate:"required" json:"entity_id"`
	Content    string     `validate:"required,min=1" json:"content"`
}

type UpdateCommentRequest struct {
	Content string `validate:"required,min=1" json:"content"`
}

type CommentDatabaseResponse struct {
	ID                uuid.UUID  `json:"id"`
	TripID            uuid.UUID  `json:"trip_id"`
	EntityType        EntityType `json:"entity_type"`
	EntityID          uuid.UUID  `json:"entity_id"`
	UserID            uuid.UUID  `json:"user_id"`
	Username          string     `json:"username"`
	ProfilePictureID  *uuid.UUID `json:"profile_picture_id"` // pointer since some users don't have their avatar set
	ProfilePictureKey *string    `bun:"profile_picture_key" json:"-"`
	Content           string     `json:"content"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type CommentAPIResponse struct {
	ID                uuid.UUID  `json:"id"`
	TripID            uuid.UUID  `json:"trip_id"`
	EntityType        EntityType `json:"entity_type"`
	EntityID          uuid.UUID  `json:"entity_id"`
	UserID            uuid.UUID  `json:"user_id"`
	Username          string     `json:"username"`
	ProfilePictureURL *string    `json:"profile_picture_url"` // pointer since some users don't have their avatar set
	Content           string     `json:"content"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type GetCommentsQueryParams struct {
	CursorPaginationParams
}

// CommentCursor reuses the standard time+UUID cursor payload.
type CommentCursor = TimeUUIDCursor

type PaginatedCommentsResponse struct {
	Items      []*CommentAPIResponse `json:"items"`
	NextCursor *string               `json:"next_cursor,omitempty"`
	Limit      int                   `json:"limit"`
}
