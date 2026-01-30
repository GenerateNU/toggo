package models

import (
	"time"

	"github.com/google/uuid"
)

type EntityType string

const (
	Activity EntityType = "activity"
	Pitch    EntityType = "pitch"
)

type Comment struct {
	ID         uuid.UUID  `bun:"id,pk,type:uuid,default:gen_random_uuid()" json:"id"`
	TripID     uuid.UUID  `bun:"trip_id,type:uuid,notnull" json:"trip_id"`
	EntityType EntityType `bun:"entity_type,notnull" json:"entity_type"`
	EntityID   uuid.UUID  `bun:"entity_id,type:uuid,notnull" json:"entity_id"`
	UserID     uuid.UUID  `bun:"user_id,type:uuid,notnull" json:"user_id"`
	Content    string     `bun:"content,notnull" json:"content"`
	CreatedAt  time.Time  `bun:"created_at,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt  time.Time  `bun:"updated_at,notnull,default:current_timestamp" json:"updated_at"`
}

type CreateCommentRequest struct {
	TripID     uuid.UUID  `validate:"required" json:"trip_id"`
	EntityType EntityType `validate:"required,oneof=activity pitch" json:"entity_type"`
	EntityID   uuid.UUID  `validate:"required" json:"entity_id"`
	UserID     uuid.UUID  `validate:"required" json:"user_id"`
	Content    string     `validate:"required,min=1" json:"content"`
}

type UpdateCommentRequest struct {
	Content string `validate:"required,min=1" json:"content"`
}

type CommentResponse struct {
	ID         uuid.UUID  `json:"id"`
	TripID     uuid.UUID  `json:"trip_id"`
	EntityType EntityType `json:"entity_type"`
	EntityID   uuid.UUID  `json:"entity_id"`
	UserID     uuid.UUID  `json:"user_id"`
	Username   string     `json:"username"`
	AvatarURL  *string    `json:"avatar_url"` // pointer since some users don't have their avatar set
	Content    string     `json:"content"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}
